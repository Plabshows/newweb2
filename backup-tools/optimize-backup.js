const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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

async function optimize() {
    const files = await getFiles(storageDir);
    
    console.log(`🚀 Aggressive Optimization of ${files.length} files...`);
    
    let totalSaved = 0;
    let count = 0;

    for (const file of files) {
        const stats = fs.statSync(file);
        if (stats.isDirectory()) continue;
        
        const originalSize = stats.size;
        
        // Skip small files
        if (originalSize < 100 * 1024) continue;

        try {
            const image = sharp(file);
            const metadata = await image.metadata();
            
            let pipeline = image;
            if (metadata.width > 1200) {
                pipeline = pipeline.resize(1200, null, { withoutEnlargement: true });
            }

            let buffer;
            const format = metadata.format;

            if (format === 'jpeg' || format === 'jpg') {
                buffer = await pipeline.jpeg({ quality: 50, progressive: true }).toBuffer();
            } else if (format === 'png') {
                // For PNGs, we can either use pngquant or convert to jpeg if they don't have alpha
                if (metadata.hasAlpha) {
                    buffer = await pipeline.png({ quality: 60, compressionLevel: 9 }).toBuffer();
                } else {
                    // No alpha? Convert to JPEG to save massive space
                    buffer = await pipeline.jpeg({ quality: 50, progressive: true }).toBuffer();
                }
            } else if (format === 'webp') {
                buffer = await pipeline.webp({ quality: 50 }).toBuffer();
            } else {
                // Other formats, skip or use generic
                continue;
            }

            if (buffer.length < originalSize) {
                fs.writeFileSync(file, buffer);
                totalSaved += (originalSize - buffer.length);
                count++;
                console.log(`✅ Compressed ${format.toUpperCase()}: ${path.relative(storageDir, file)} | ${ (originalSize/1024/1024).toFixed(2) }MB -> ${ (buffer.length/1024/1024).toFixed(2) }MB`);
            }
        } catch (err) {
            // Not an image or sharp can't read it
        }
    }

    console.log(`\n✨ Aggressive optimization complete!`);
    console.log(`📦 Optimized ${count} images.`);
    console.log(`💾 Extra space saved: ${ (totalSaved/1024/1024).toFixed(2) }MB`);
}

optimize();
