const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getBucketSize(bucketName) {
    let totalSize = 0;
    let fileCount = 0;
    
    async function listAllFiles(path = '') {
        let { data, error } = await supabase.storage.from(bucketName).list(path, {
            limit: 100,
            offset: 0
        });
        
        if (error) return;
        
        for (const item of data) {
            if (item.id === null) {
                // It's a folder
                await listAllFiles(path ? `${path}/${item.name}` : item.name);
            } else {
                totalSize += item.metadata.size;
                fileCount++;
            }
        }
    }
    
    await listAllFiles();
    return { totalSize, fileCount };
}

async function run() {
    console.log("Checking storage sizes...");
    const buckets = ['media', 'web-media'];
    for (const b of buckets) {
        const { totalSize, fileCount } = await getBucketSize(b);
        console.log(`Bucket ${b}: ${(totalSize / 1024 / 1024).toFixed(2)} MB (${fileCount} files)`);
    }
}

run();
