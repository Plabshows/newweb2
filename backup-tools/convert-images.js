const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const imagesDir = path.join(projectDir, 'images');

const MAX_WIDTH = 1600; // Max width for web images
const QUALITY = 75;    // Balanced quality/size

async function getFiles(dir) {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function optimizeImages() {
    console.log(`🚀 Resizing and compressing images (Max Width: ${MAX_WIDTH}px, Quality: ${QUALITY})...`);
    
    try {
        const allFiles = await getFiles(imagesDir);
        // We process originals (png, jpg, jpeg) and save as webp
        const imageFiles = allFiles.filter(file => 
            /\.(png|jpg|jpeg)$/i.test(file)
        );

        console.log(`🔍 Found ${imageFiles.length} images to optimize.`);

        for (const file of imageFiles) {
            const webpPath = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
            
            const image = sharp(file);
            const metadata = await image.metadata();

            let pipeline = image;
            if (metadata.width > MAX_WIDTH) {
                pipeline = pipeline.resize(MAX_WIDTH);
                console.log(`📏 Resizing ${path.basename(file)} (was ${metadata.width}px)`);
            }

            await pipeline
                .webp({ quality: QUALITY })
                .toFile(webpPath + '.tmp');
            
            fs.renameSync(webpPath + '.tmp', webpPath);
            console.log(`✅ Optimized: ${path.basename(file)} -> ${path.basename(webpPath)}`);
        }

        console.log('\n✨ Image optimization complete!');
    } catch (err) {
        console.error('❌ Error during optimization:', err.message);
    }
}

optimizeImages();
