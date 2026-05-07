const fs = require('fs');
const path = require('path');
const minify = require('html-minifier-terser').minify;
const Terser = require('terser');
const CleanCSS = require('clean-css');

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

const jsFiles = [
    'categories.js',
    'booking-handler.js',
    'generate-elements-static.js'
];

async function minifyAll() {
    console.log('🚀 Starting minification process...');

    // Minify HTML
    for (const file of htmlFiles) {
        const filePath = path.join(projectDir, file);
        if (!fs.existsSync(filePath)) continue;

        console.log(`📄 Minifying HTML: ${file}...`);
        const original = fs.readFileSync(filePath, 'utf8');
        try {
            const minified = await minify(original, {
                collapseWhitespace: true,
                removeComments: true,
                minifyJS: true,
                minifyCSS: true,
                processConditionalComments: true,
                removeEmptyAttributes: true,
                removeRedundantAttributes: true,
                trimCustomFragments: true
            });
            fs.writeFileSync(filePath, minified);
            console.log(`✅ ${file} minified.`);
        } catch (err) {
            console.error(`❌ Error minifying ${file}:`, err.message);
        }
    }

    // Minify JS
    for (const file of jsFiles) {
        const filePath = path.join(projectDir, file);
        if (!fs.existsSync(filePath)) continue;

        console.log(`📜 Minifying JS: ${file}...`);
        const original = fs.readFileSync(filePath, 'utf8');
        try {
            const result = await Terser.minify(original);
            if (result.error) throw result.error;
            fs.writeFileSync(filePath, result.code);
            console.log(`✅ ${file} minified.`);
        } catch (err) {
            console.error(`❌ Error minifying ${file}:`, err.message);
        }
    }

    console.log('\n✨ Minification complete! Your site is now optimized for production.');
}

minifyAll();
