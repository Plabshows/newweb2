const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKETS = ['media', 'web-media'];

async function listAllFiles(bucketName, folderPath = '') {
    let allFiles = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
        const { data, error } = await supabase.storage.from(bucketName).list(folderPath, {
            limit: limit,
            offset: offset,
            sortBy: { column: 'name', order: 'asc' }
        });

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const item of data) {
            const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
            if (item.id === null) {
                // It's a folder
                const subFiles = await listAllFiles(bucketName, itemPath);
                allFiles = allFiles.concat(subFiles);
            } else {
                // It's a file
                allFiles.push({
                    bucket: bucketName,
                    name: itemPath,
                    size: item.metadata?.size || 0,
                    mimetype: item.metadata?.mimetype || 'unknown'
                });
            }
        }

        if (data.length < limit) break;
        offset += limit;
    }
    return allFiles;
}

async function verifyStorage() {
    console.log('🔍 Verifying Supabase Storage (media & web-media)...\n');
    let totalSize = 0;
    let allFiles = [];

    for (const bucket of BUCKETS) {
        console.log(`🪣 Listing bucket: ${bucket}...`);
        try {
            const files = await listAllFiles(bucket);
            files.forEach(f => {
                totalSize += f.size;
                allFiles.push(f);
            });
            console.log(`✅ Found ${files.length} files in ${bucket}`);
        } catch (err) {
            console.error(`❌ Error listing bucket ${bucket}:`, err.message);
        }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`📏 Total files: ${allFiles.length}`);
    console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log(`\n🔥 LARGEST FILES (Potential candidates for optimization):`);
    const sorted = allFiles.sort((a, b) => b.size - a.size).slice(0, 20);
    sorted.forEach((f, i) => {
        const sizeMB = (f.size / 1024 / 1024).toFixed(2);
        const status = f.size > 1024 * 1024 ? '⚠️' : '✅';
        console.log(`${i + 1}. ${status} ${sizeMB} MB | ${f.bucket}/${f.name}`);
    });
}

verifyStorage();
