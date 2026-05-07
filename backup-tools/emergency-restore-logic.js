const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_PROJECT_URL = process.env.SUPABASE_URL;

function vercelToSupabase(vercelUrl) {
    if (!vercelUrl || typeof vercelUrl !== 'string') return vercelUrl;
    if (!vercelUrl.includes('vercel-storage.com')) return vercelUrl;

    try {
        const url = new URL(vercelUrl);
        // Path structure: /[bucket]/[folders...]/[filename]-[hash].[ext]/[id]
        // or /[bucket]/[filename]-[hash].[ext]
        
        let fullPath = url.pathname.substring(1); // remove leading slash
        
        // Remove Vercel's random hash suffix (usually 30 chars after a dash)
        // Pattern: -[A-Za-z0-9]{30}
        const cleanedPath = fullPath.replace(/-[A-Za-z0-9]{30}/g, '');
        
        // Construct Supabase public URL
        // Structure: https://[project].supabase.co/storage/v1/object/public/[cleanedPath]
        return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${cleanedPath}`;
    } catch (e) {
        return vercelUrl;
    }
}

async function emergencyRestore() {
    const tables = ['acts', 'profiles', 'pld_characters'];
    
    for (const table of tables) {
        console.log(`\n🚑 Processing table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
            console.error(`❌ Error fetching ${table}:`, error.message);
            continue;
        }

        for (const row of data) {
            const id = row.id;
            const updates = {};
            let needsUpdate = false;

            Object.keys(row).forEach(key => {
                const val = row[key];
                
                if (typeof val === 'string' && val.includes('vercel-storage.com')) {
                    const restored = vercelToSupabase(val);
                    if (restored !== val) {
                        updates[key] = restored;
                        needsUpdate = true;
                    }
                } else if (Array.isArray(val)) {
                    // Handle gallery arrays
                    const newVal = val.map(item => {
                        if (typeof item === 'object' && item !== null && item.url && item.url.includes('vercel-storage.com')) {
                            return { ...item, url: vercelToSupabase(item.url) };
                        }
                        if (typeof item === 'string' && item.includes('vercel-storage.com')) {
                            return vercelToSupabase(item);
                        }
                        return item;
                    });
                    if (JSON.stringify(newVal) !== JSON.stringify(val)) {
                        updates[key] = newVal;
                        needsUpdate = true;
                    }
                }
            });

            if (needsUpdate) {
                console.log(`🔄 Reverting record ${id} in ${table}...`);
                const { error: updateError } = await supabase.from(table).update(updates).eq('id', id);
                if (updateError) {
                    console.error(`❌ Failed to update ${id}:`, updateError.message);
                } else {
                    console.log(`✅ Restored ${id}`);
                }
            }
        }
    }
}

emergencyRestore();
