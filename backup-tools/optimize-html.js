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

async function optimizeHtml() {
    for (const file of htmlFiles) {
        const filePath = path.join(projectDir, file);
        if (!fs.existsSync(filePath)) continue;

        let content = fs.readFileSync(filePath, 'utf8');

        // 1. Add loading="lazy" to images that don't have it
        // We exclude images that are likely "above the fold" or already have a loading attribute
        content = content.replace(/<img([^>]+)>/g, (match, attrs) => {
            if (attrs.includes('loading=') || attrs.includes('fetchpriority=')) {
                return match;
            }
            
            // Skip logos or hero images if possible
            if (attrs.includes('logo') || attrs.includes('hero') || attrs.includes('h-12') || attrs.includes('h-14')) {
                return `<img${attrs} fetchpriority="high">`;
            }

            return `<img${attrs} loading="lazy">`;
        });

        // 2. Update local image extensions to .webp (assuming we will convert them)
        // We only target local images in images/ folder
        content = content.replace(/src="images\/([^"]+)\.(png|jpg|jpeg)"/g, 'src="images/$1.webp"');

        // 3. Update Supabase storage URLs to use direct optimized links (no transformation needed since we optimized Storage)
        content = content.replace(/https:\/\/([a-z0-9]+)\.supabase\.co\/storage\/v1\/render\/image\/public\/([^" \?]+)\?format=webp&width=1200/g, (match, ref, path) => {
            return `https://${ref}.supabase.co/storage/v1/object/public/${path}`;
        });


        fs.writeFileSync(filePath, content);
        console.log(`✅ Optimized ${file}`);
    }
}

optimizeHtml();
