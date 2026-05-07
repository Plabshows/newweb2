const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const backupDataDir = path.join(__dirname, '../supabase-backup/data');

async function restoreURLs() {
    const tables = ['acts', 'profiles', 'pld_characters'];
    
    for (const table of tables) {
        const backupFile = path.join(backupDataDir, `${table}.json`);
        if (!fs.existsSync(backupFile)) {
            console.log(`⚠️ Backup not found for ${table}, skipping.`);
            continue;
        }

        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        console.log(`\n📦 Restoring URLs for table: ${table} (${backupData.length} rows in backup)...`);

        for (const backupRow of backupData) {
            const id = backupRow.id;
            
            // Identify URL fields
            const updateData = {};
            let needsUpdate = false;

            Object.keys(backupRow).forEach(key => {
                const val = backupRow[key];
                if (typeof val === 'string' && val.includes('supabase.co')) {
                    updateData[key] = val;
                    needsUpdate = true;
                } else if (Array.isArray(val)) {
                    // Check for gallery arrays
                    const newVal = val.map(item => {
                        if (typeof item === 'object' && item !== null && item.url && item.url.includes('supabase.co')) {
                            return item;
                        }
                        if (typeof item === 'string' && item.includes('supabase.co')) {
                            return item;
                        }
                        return null; // We'll handle this
                    });
                    if (newVal.some(v => v !== null)) {
                        updateData[key] = val;
                        needsUpdate = true;
                    }
                }
            });

            if (needsUpdate) {
                // Check if the current record in DB has a Vercel URL
                const { data: dbRow, error: fetchError } = await supabase.from(table).select('*').eq('id', id).single();
                
                if (fetchError || !dbRow) {
                    // console.log(`⏩ Row ${id} not found in DB or error, skipping.`);
                    continue;
                }

                let hasVercel = false;
                Object.values(dbRow).forEach(v => {
                    if (String(v).includes('vercel-storage.com')) hasVercel = true;
                });

                if (hasVercel) {
                    console.log(`🔄 Reverting ${table} row ${id} to Supabase URLs...`);
                    const { error: updateError } = await supabase.from(table).update(updateData).eq('id', id);
                    if (updateError) {
                        console.error(`❌ Error updating ${id}:`, updateError.message);
                    } else {
                        console.log(`✅ Restored ${id}`);
                    }
                }
            }
        }
    }
}

restoreURLs();
