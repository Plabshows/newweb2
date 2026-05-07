const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const htmlFiles = [
    'index.html',
    'admin.html',
    'experiences.html',
    'show-details.html',
    'the-elements.html',
    'the-lab.html',
    'stitch_homepage.html'
];

async function updateHtml() {
    for (const file of htmlFiles) {
        const filePath = path.join(projectDir, file);
        if (!fs.existsSync(filePath)) continue;

        let content = fs.readFileSync(filePath, 'utf8');

        // 1. Update local image extensions to .jpg
        // Skip logos and icons
        content = content.replace(/src="images\/((?!logo|icon|favicon)[^"]+)\.(png|jpg|jpeg|webp)"/g, 'src="images/$1.jpg"');

        // 2. Update Supabase storage URLs to use JPG transformation
        content = content.replace(/format=webp/g, 'format=jpg');

        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${file} to use JPG`);
    }
}

updateHtml();
