const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const INVENTORY_FILE = './supabase-inventory.json';
const VERCEL_INVENTORY_FILE = './vercel-inventory.json';
const MAP_FILE = './migration-map.json';

async function run() {
    if (!fs.existsSync(INVENTORY_FILE)) {
        console.error("Supabase inventory not found. Run inventory.js first.");
        return;
    }

    const inventory = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
    
    // Load existing Vercel files to avoid re-uploading
    let vercelInventory = [];
    if (fs.existsSync(VERCEL_INVENTORY_FILE)) {
        vercelInventory = JSON.parse(fs.readFileSync(VERCEL_INVENTORY_FILE, 'utf8'));
    }

    let migrationMap = {};
    if (fs.existsSync(MAP_FILE)) {
        migrationMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    }

    // Pre-fill map from Vercel inventory
    console.log("Checking Vercel inventory for existing matches...");
    const supabaseBaseUrl = `${supabaseUrl}/storage/v1/object/public`;
    
    // Create a reverse lookup for vercel items by pathname
    const vercelByPathname = {};
    for (const vItem of vercelInventory) {
        vercelByPathname[vItem.pathname] = vItem.url;
    }

    for (const item of inventory) {
        const storageKey = `${item.bucket}/${item.path}`;
        const fullSupabaseUrl = `${supabaseBaseUrl}/${storageKey}`;
        
        // Fuzzy match: check if any vercel pathname starts with our storageKey
        // (handling suffixes added by Vercel)
        const match = vercelInventory.find(v => v.pathname === storageKey || v.pathname.startsWith(storageKey + '-'));
        
        if (match) {
            migrationMap[fullSupabaseUrl] = match.url;
        }
    }

    console.log(`Pre-filled ${Object.keys(migrationMap).length} matches from Vercel inventory.`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        
        // Construct the full Supabase URL as the key
        const storageKey = `${item.bucket}/${item.path}`;
        const fullSupabaseUrl = `${supabaseBaseUrl}/${storageKey}`;
        
        // Skip if already in map
        if (migrationMap[fullSupabaseUrl]) {
            skipCount++;
            continue;
        }

        console.log(`[${i+1}/${inventory.length}] Mirroring: ${storageKey}`);

        try {
            // 1. Download from Supabase
            const { data, error } = await supabase.storage
                .from(item.bucket)
                .download(item.path);

            if (error) throw error;

            // 2. Upload to Vercel Blob
            const buffer = Buffer.from(await data.arrayBuffer());
            
            try {
                const blob = await put(storageKey, buffer, {
                    access: 'public',
                    contentType: item.mimetype || 'image/jpeg',
                    addRandomSuffix: false
                });
                migrationMap[fullSupabaseUrl] = blob.url;
                successCount++;
            } catch (putErr) {
                if (putErr.message.includes('already exists')) {
                    console.log(`  File already exists in Vercel: ${storageKey}`);
                    // Fuzzy match to find the URL
                    const existing = vercelInventory.find(v => v.pathname === storageKey || v.pathname.startsWith(storageKey + '-'));
                    if (existing) {
                        migrationMap[fullSupabaseUrl] = existing.url;
                    }
                    skipCount++;
                } else {
                    throw putErr;
                }
            }
            
            // Periodically save map
            if (successCount % 10 === 0 && successCount > 0) {
                fs.writeFileSync(MAP_FILE, JSON.stringify(migrationMap, null, 2));
            }
        } catch (err) {
            console.error(`Error mirroring ${storageKey}:`, err.message);
            errorCount++;
        }
    }

    // Final save
    fs.writeFileSync(MAP_FILE, JSON.stringify(migrationMap, null, 2));

    console.log("\n--- Mirroring Complete ---");
    console.log(`Total: ${inventory.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Skipped: ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Map saved to ${MAP_FILE}`);
}

run();
