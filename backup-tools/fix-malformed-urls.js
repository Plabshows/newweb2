const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load from local .env if available

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function fixUrls() {
    console.log("🛠 Fixing malformed URLs in database...");
    
    const tables = ['acts', 'profiles', 'pld_characters'];
    let fixedCount = 0;

    for (const table of tables) {
        console.log(`Checking table: ${table}`);
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            continue;
        }

        for (const row of data) {
            let updates = {};
            let changed = false;

            for (const key of Object.keys(row)) {
                let val = row[key];
                
                // Handle strings (URLs)
                if (typeof val === 'string' && val.includes('.blob_http')) {
                    const fixed = val.split('.blob_http')[0];
                    updates[key] = fixed;
                    changed = true;
                    console.log(`  [${table}] ID:${row.id} Fixed ${key}: ${val} -> ${fixed}`);
                }
                
                // Handle arrays (galleries)
                if (Array.isArray(val)) {
                    let newArr = val.map(item => {
                        if (typeof item === 'string' && item.includes('.blob_http')) {
                            changed = true;
                            return item.split('.blob_http')[0];
                        }
                        if (item && typeof item === 'object' && item.url && item.url.includes('.blob_http')) {
                            changed = true;
                            return { ...item, url: item.url.split('.blob_http')[0] };
                        }
                        return item;
                    });
                    if (changed) updates[key] = newArr;
                }
            }

            if (changed) {
                const { error: updateErr } = await supabase.from(table).update(updates).eq('id', row.id);
                if (updateErr) {
                    console.error(`  ❌ Error updating row ${row.id}:`, updateErr.message);
                } else {
                    fixedCount++;
                }
            }
        }
    }

    console.log(`\n✅ Finished. Total rows fixed: ${fixedCount}`);
}

fixUrls();
