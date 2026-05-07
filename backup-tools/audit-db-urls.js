const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function auditDB() {
    const tables = ['acts', 'profiles', 'pld_characters']; // Common tables with image fields
    
    for (const table of tables) {
        console.log(`\n🔍 Auditing table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
            console.error(`❌ Error querying ${table}:`, error.message);
            continue;
        }

        let vercelCount = 0;
        let supabaseCount = 0;

        data.forEach(row => {
            // Check all columns for URL patterns
            Object.keys(row).forEach(key => {
                const val = String(row[key]);
                if (val.includes('vercel-storage.com')) {
                    vercelCount++;
                } else if (val.includes('supabase.co')) {
                    supabaseCount++;
                }
            });
        });

        console.log(`✅ Supabase URLs: ${supabaseCount}`);
        console.log(`⚠️ Vercel URLs: ${vercelCount}`);
        
        if (supabaseCount > 0) {
            console.log(`👉 Samples of Supabase URLs in ${table}:`);
            data.forEach(row => {
                Object.keys(row).forEach(key => {
                    const val = String(row[key]);
                    if (val.includes('supabase.co') && val.startsWith('http')) {
                        console.log(`   - ${val}`);
                    }
                });
            });
        }
    }
}

auditDB();
