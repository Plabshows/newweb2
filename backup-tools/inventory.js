const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function listAllFiles(bucketName) {
    console.log(`Listing files for ${bucketName}...`);
    const allFiles = [];
    
    async function recurse(path = '') {
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase.storage.from(bucketName).list(path, {
                limit: 100,
                offset: offset
            });
            
            if (error) {
                console.error(`Error in ${path}:`, error.message);
                break;
            }

            if (!data || data.length === 0) break;

            for (const item of data) {
                const fullPath = path ? `${path}/${item.name}` : item.name;
                if (item.id === null) {
                    await recurse(fullPath);
                } else {
                    allFiles.push({
                        bucket: bucketName,
                        path: fullPath,
                        size: item.metadata.size,
                        mimetype: item.metadata.mimetype
                    });
                }
            }

            if (data.length < 100) {
                hasMore = false;
            } else {
                offset += 100;
            }
        }
    }
    
    await recurse();
    return allFiles;
}

async function run() {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error.message);
        return;
    }

    console.log(`Found ${buckets.length} buckets:`, buckets.map(b => `${b.name} (${b.public ? 'public' : 'private'})`));

    let total = [];
    for (const bucket of buckets) {
        if (bucket.public) {
            const files = await listAllFiles(bucket.name);
            console.log(`- ${bucket.name}: ${files.length} files`);
            total = total.concat(files);
        }
    }
    
    console.log(`\n--- INVENTARIO COMPLETADO ---`);
    console.log(`Total archivos: ${total.length}`);
    
    const fs = require('fs');
    fs.writeFileSync('supabase-inventory.json', JSON.stringify(total, null, 2));
    console.log(`Inventario guardado en supabase-inventory.json`);
}

run();
