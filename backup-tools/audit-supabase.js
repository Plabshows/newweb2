const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKETS = [
    'act-photos',
    'artist-portfolio',
    'technical-riders',
    'media',
    'experiences_media',
    'web-media'
];

async function listAllFilesWithMetadata(bucketName, folderPath = '') {
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

        console.log(`  📂 ${folderPath || 'root'} | Offset: ${offset} | Found ${data.length} items`);

        for (const item of data) {
            const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
            if (item.id === null) {
                // It's a folder
                const subFiles = await listAllFilesWithMetadata(bucketName, itemPath);
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

async function runAudit() {
    console.log('🔍 Starting Supabase Storage Audit...\n');
    let totalSize = 0;
    let allFilesReport = [];

    for (const bucket of BUCKETS) {
        console.log(`🪣 Auditing bucket: ${bucket}...`);
        try {
            const files = await listAllFilesWithMetadata(bucket);
            let bucketSize = 0;
            files.forEach(f => {
                totalSize += f.size;
                bucketSize += f.size;
                allFilesReport.push(f);
            });
            console.log(`✅ Found ${files.length} files in ${bucket} | Total: ${(bucketSize / 1024 / 1024).toFixed(2)} MB`);
        } catch (err) {
            console.error(`❌ Error auditing bucket ${bucket}:`, err.message);
        }
    }

    console.log(`\n📊 TOTAL STORAGE REPORT:`);
    console.log(`📏 Total files found: ${allFilesReport.length}`);
    console.log(`💾 Total calculated size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log(`\n🔥 TOP 20 LARGEST FILES:`);
    const sorted = allFilesReport.sort((a, b) => b.size - a.size).slice(0, 20);
    sorted.forEach((f, i) => {
        console.log(`${i + 1}. ${(f.size / 1024 / 1024).toFixed(2)} MB | ${f.bucket}/${f.name} (${f.mimetype})`);
    });

    const over1MB = allFilesReport.filter(f => f.size > 1024 * 1024);
    console.log(`\n⚠️ Files over 1MB: ${over1MB.length}`);
}

runAudit();
