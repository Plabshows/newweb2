const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function optimizeBucket(bucketName) {
    console.log(`\n📦 Auditando bucket: ${bucketName}...`);
    
    // List all files recursively
    async function listAllFiles(path = '') {
        const { data, error } = await supabase.storage.from(bucketName).list(path, {
            limit: 100,
            offset: 0
        });
        
        if (error) {
            console.error(`Error listando files en ${path}:`, error.message);
            return [];
        }
        
        let files = [];
        for (const item of data) {
            const itemPath = path ? `${path}/${item.name}` : item.name;
            if (item.id === null) {
                // Folder
                const subFiles = await listAllFiles(itemPath);
                files = files.concat(subFiles);
            } else {
                files.push({
                    name: item.name,
                    path: itemPath,
                    size: item.metadata.size,
                    mimetype: item.metadata.mimetype
                });
            }
        }
        return files;
    }

    const allFiles = await listAllFiles();
    console.log(`Total archivos encontrados: ${allFiles.length}`);

    // Filter large images (> 1MB)
    const largeImages = allFiles.filter(f => 
        f.size > 1024 * 1024 && 
        (f.mimetype.includes('image/jpeg') || f.mimetype.includes('image/png'))
    ).sort((a, b) => b.size - a.size);

    console.log(`Archivos pesados (>1MB) encontrados: ${largeImages.length}`);

    // Take top 10 for safety in this run
    const toProcess = largeImages.slice(0, 10);
    
    for (const file of toProcess) {
        console.log(`\n⏳ Procesando: ${file.path} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        try {
            // 1. Download
            const { data: blob, error: dlError } = await supabase.storage.from(bucketName).download(file.path);
            if (dlError) throw dlError;
            
            const buffer = Buffer.from(await blob.arrayBuffer());
            
            // 2. Optimize with sharp
            // Resize to 1200px max width and convert to webp (or stay jpg if preferred)
            const optimizedBuffer = await sharp(buffer)
                .resize(1200, null, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            
            console.log(`✨ Optimizado: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);

            // 3. Re-upload (Overwrite)
            // Note: Since we changed to .webp, we might want to keep the same name if it's hardcoded in DB,
            // or update DB. BUT for "cleaning", the safest is to keep the SAME PATH so the URL doesn't break.
            // If we keep the same path (e.g. .jpg extension) but send webp data, browsers usually handle it,
            // but it's cleaner to keep the format or update DB.
            
            // Let's keep the same extension for now but optimized (e.g. compressed JPG if it was JPG)
            let finalBuffer;
            if (file.mimetype.includes('jpeg')) {
                finalBuffer = await sharp(buffer).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
            } else {
                finalBuffer = await sharp(buffer).resize(1200, null, { withoutEnlargement: true }).png({ quality: 80 }).toBuffer();
            }

            const { error: ulError } = await supabase.storage.from(bucketName).upload(file.path, finalBuffer, {
                upsert: true,
                contentType: file.mimetype
            });
            
            if (ulError) throw ulError;
            console.log(`✅ Sobreescrito con éxito.`);
            
        } catch (err) {
            console.error(`❌ Error procesando ${file.path}:`, err.message);
        }
    }
}

async function run() {
    await optimizeBucket('media');
    await optimizeBucket('web-media');
    console.log("\n🚀 Limpieza terminada.");
}

run();
