const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('❌ Error listing buckets:', error.message);
        return;
    }
    console.log('🪣 All Buckets:');
    data.forEach(b => console.log(`- ${b.name} (${b.public ? 'Public' : 'Private'})`));
}

checkBuckets();
