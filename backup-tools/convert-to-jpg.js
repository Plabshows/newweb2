const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const imagesDir = path.join(projectDir, 'images');

async function getFiles(dir) {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function convertToJpg() {
    console.log('🚀 Converting images to JPG (Quality: 60)...');
    
    try {
        const allFiles = await getFiles(imagesDir);
        const imageFiles = allFiles.filter(file => 
            /\.(png|jpg|jpeg|webp)$/i.test(file) && !file.includes('logo') && !file.includes('icon') && !file.includes('favicon')
        );

        console.log(`🔍 Found ${imageFiles.length} candidate images.`);

        for (const file of imageFiles) {
            const jpgPath = file.replace(/\.(png|jpg|jpeg|webp)$/i, '.jpg');
            
            // If it's already a jpg, we still process it to apply 60 compression
            await sharp(file)
                .flatten({ background: { r: 19, g: 19, b: 19 } }) // Background color #131313 for transparency
                .jpeg({ quality: 60 })
                .toFile(jpgPath + '.tmp');
            
            fs.renameSync(jpgPath + '.tmp', jpgPath);
            console.log(`✅ Converted/Compressed: ${path.basename(file)} -> ${path.basename(jpgPath)}`);
        }

        console.log('\n✨ JPG Conversion complete!');
    } catch (err) {
        console.error('❌ Error during conversion:', err.message);
    }
}

convertToJpg();
