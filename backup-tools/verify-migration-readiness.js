const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verifyReadiness() {
    console.log("🚀 Verifying migration readiness...");
    
    let migrationMap = {};
    if (fs.existsSync('migration-map.json')) {
        migrationMap = JSON.parse(fs.readFileSync('migration-map.json', 'utf8'));
    } else {
        console.error("❌ migration-map.json not found. Run mirroring script first.");
        return;
    }

    const tables = ['acts', 'profiles', 'pld_characters'];
    let totalUrls = 0;
    let mappedUrls = 0;
    let missingUrls = [];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) continue;

        data.forEach(row => {
            Object.keys(row).forEach(key => {
                const val = String(row[key]);
                // Handle comma separated lists in gallery fields
                const urls = val.split(',');
                
                urls.forEach(url => {
                    const cleanUrl = url.trim();
                    if (cleanUrl.includes('supabase.co') && cleanUrl.startsWith('http')) {
                        totalUrls++;
                        if (migrationMap[cleanUrl]) {
                            mappedUrls++;
                        } else {
                            missingUrls.push({ table, id: row.id, field: key, url: cleanUrl });
                        }
                    }
                });
            });
        });
    }

    console.log(`\n📊 Status:`);
    console.log(`- Total Supabase URLs in DB: ${totalUrls}`);
    console.log(`- Mapped to Vercel: ${mappedUrls} (${((mappedUrls/totalUrls)*100).toFixed(1)}%)`);
    console.log(`- Missing Mirrors: ${missingUrls.length}`);

    if (missingUrls.length > 0) {
        console.log(`\n⚠️ Missing Mirrors Samples:`);
        missingUrls.slice(0, 5).forEach(m => {
            console.log(`[${m.table}] ID:${m.id} Field:${m.field} URL:${m.url}`);
        });
        
        // Save missing list
        fs.writeFileSync('missing-mirrors.json', JSON.stringify(missingUrls, null, 2));
        console.log(`\n📄 Full missing list saved to missing-mirrors.json`);
    }

    if (mappedUrls === totalUrls && totalUrls > 0) {
        console.log("\n✅ ALL URLs are mapped! Ready for final DB update.");
    }
}

verifyReadiness();
