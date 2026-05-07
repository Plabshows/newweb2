const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase
        .from('_prisma_migrations') // Try to find some common tables or use a generic query
        .select('*')
        .limit(1);
        
    // Actually, I'll use a SQL query to get table names
    const { data: tables, error: sqlError } = await supabase.rpc('get_tables'); // If this RPC exists
    
    if (sqlError) {
        // Fallback: try to query information_schema if permitted, or just list known ones
        console.log("Could not use RPC. Querying public tables directly...");
        const knownTables = ['acts', 'profiles', 'pld_characters', 'pld_gallery', 'categories', 'events', 'bookings'];
        for (const table of knownTables) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (!error) console.log(`Table: ${table} - Found`);
            else if (error.code !== '42P01') console.log(`Table: ${table} - Error: ${error.message}`);
        }
    } else {
        console.log("Tables:", tables);
    }
}

listTables();
