const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const storageDir = path.join(__dirname, '../supabase-backup/storage');

async function getFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function upload() {
    const files = (await getFiles(storageDir)).filter(f => !path.basename(f).startsWith('.'));
    
    console.log(`🚀 Re-uploading ${files.length} optimized files to Supabase...`);


    for (const filePath of files) {
        // Relative path from storageDir to file
        const relativePath = path.relative(storageDir, filePath);
        const parts = relativePath.split(path.sep);
        const bucket = parts[0];
        const storagePath = parts.slice(1).join('/');

        const fileContent = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);

        console.log(`📤 Uploading to ${bucket}/${storagePath}...`);
        
        const { error } = await supabase.storage
            .from(bucket)
            .upload(storagePath, fileContent, {
                contentType: contentType,
                upsert: true // This is key to overwrite
            });

        if (error) {
            console.error(`❌ Error uploading ${storagePath}:`, error.message);
        } else {
            console.log(`✅ Success: ${storagePath}`);
        }
    }

    console.log('\n✨ All files re-uploaded and optimized in Supabase!');
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg': case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.webp': return 'image/webp';
        case '.gif': return 'image/gif';
        default: return 'application/octet-stream';
    }
}

upload();
