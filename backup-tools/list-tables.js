const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    // There is no direct "listTables" in supabase-js for all tables without access token, 
    // but we can try to query common tables or use rpc if available.
    // However, usually we can just check what we have in the backup script and see if they fail.
    // Let's try to query information_schema if we have enough permissions.
    const { data, error } = await supabase.rpc('get_tables'); // if they have a helper rpc
    if (error) {
        // Fallback: try raw query via postgrest if possible (usually not allowed for info_schema)
        console.log("Could not use RPC. Trying common tables...");
        const tables = ['acts', 'pld_characters', 'categories', 'profiles', 'shows', 'app_shows', 'shows_new', 'performers'];
        for (const t of tables) {
            const { error: tErr } = await supabase.from(t).select('id').limit(1);
            if (!tErr) {
                console.log(`✅ Table exists: ${t}`);
            } else {
                console.log(`❌ Table not found/accessible: ${t} (${tErr.message})`);
            }
        }
    } else {
        console.log("Tables:", data);
    }
}

listTables();
