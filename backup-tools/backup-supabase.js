const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}


const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});


const BACKUP_DIR = path.join(__dirname, '../supabase-backup');
const DATA_DIR = path.join(BACKUP_DIR, 'data');
const STORAGE_DIR = path.join(BACKUP_DIR, 'storage');

// Tables to backup
const TABLES = [
    'acts',
    'pld_characters',
    'categories',
    'profiles',
    'shows',
    'app_shows'
];

// Buckets to backup
const BUCKETS = [
    'act-photos',
    'artist-portfolio',
    'technical-riders',
    'media',
    'experiences_media',
    'web-media'
];


async function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function backupTables() {
    console.log('\n--- 📊 Backing up Tables ---');
    await ensureDir(DATA_DIR);

    for (const table of TABLES) {
        console.log(`📦 Exporting table: ${table}...`);
        try {
            const { data, error } = await supabase.from(table).select('*');
            
            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn(`⚠️ Table "${table}" not found or empty. Skipping.`);
                    continue;
                }
                throw error;
            }

            if (!data || data.length === 0) {
                console.log(`ℹ️ Table "${table}" is empty.`);
                continue;
            }

            // Save JSON
            const jsonPath = path.join(DATA_DIR, `${table}.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
            console.log(`✅ Saved ${data.length} rows to ${table}.json`);

            // Save CSV (Simple conversion)
            if (data.length > 0) {
                const csvPath = path.join(DATA_DIR, `${table}.csv`);
                const headers = Object.keys(data[0]);
                const csvContent = [
                    headers.join(','),
                    ...data.map(row => headers.map(header => {
                        const val = row[header];
                        if (val === null || val === undefined) return '';
                        const str = String(val).replace(/"/g, '""');
                        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
                    }).join(','))
                ].join('\n');
                fs.writeFileSync(csvPath, csvContent);
                console.log(`✅ Saved CSV to ${table}.csv`);
            }
        } catch (err) {
            console.error(`❌ Error exporting table ${table}:`, err.message);
        }
    }
}

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

        console.log(`  📂 ${folderPath || 'root'} | Offset: ${offset} | Found ${data.length} items`);

        for (const item of data) {
            const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
            if (item.id === null) {
                // It's a folder
                const subFiles = await listAllFiles(bucketName, itemPath);
                allFiles = allFiles.concat(subFiles);
            } else {
                // It's a file
                allFiles.push(itemPath);
            }
        }

        if (data.length < limit) break;
        offset += limit;
    }
    return allFiles;
}

async function downloadFile(bucketName, filePath) {
    const fullLocalPath = path.join(STORAGE_DIR, bucketName, filePath);
    await ensureDir(path.dirname(fullLocalPath));

    if (fs.existsSync(fullLocalPath)) {
        // console.log(`⏩ Skipping ${filePath} (already exists)`);
        return;
    }

    try {
        const { data, error } = await supabase.storage.from(bucketName).download(filePath);
        if (error) throw error;

        const buffer = Buffer.from(await data.arrayBuffer());
        fs.writeFileSync(fullLocalPath, buffer);
        console.log(`✅ Downloaded: ${bucketName}/${filePath}`);
    } catch (err) {
        console.error(`❌ Error downloading ${filePath}:`, err.message);
    }
}

async function backupStorage() {
    console.log('\n--- 📂 Backing up Storage ---');
    await ensureDir(STORAGE_DIR);

    for (const bucket of BUCKETS) {
        console.log(`🪣 Processing bucket: ${bucket}...`);
        try {
            const files = await listAllFiles(bucket);
            console.log(`🔍 Found ${files.length} files in ${bucket}`);

            for (const file of files) {
                await downloadFile(bucket, file);
            }
        } catch (err) {
            if (err.message.includes('not found')) {
                console.warn(`⚠️ Bucket "${bucket}" not found. Skipping.`);
            } else {
                console.error(`❌ Error processing bucket ${bucket}:`, err.message);
            }
        }
    }
}

async function runBackup() {
    console.log('🚀 Starting Supabase Backup...');
    const startTime = Date.now();

    try {
        await backupTables();
        await backupStorage();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✨ Backup complete in ${duration}s!`);
        console.log(`📍 Location: ${BACKUP_DIR}`);
    } catch (err) {
        console.error('\n💥 Critical Error during backup:', err.message);
    }
}

runBackup();
