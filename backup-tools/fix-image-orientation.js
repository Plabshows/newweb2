const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function fixOrientation() {
    console.log("🔄 Starting image orientation correction...");
    
    if (!fs.existsSync('supabase-inventory.json')) {
        console.error("❌ Inventory not found. Run inventory.js first.");
        return;
    }

    const inventory = JSON.parse(fs.readFileSync('supabase-inventory.json', 'utf8'));
    
    // Filter for images only
    const images = inventory.filter(f => 
        f.mimetype && f.mimetype.startsWith('image/') && 
        !f.path.endsWith('.svg') && !f.path.endsWith('.gif')
    );

    console.log(`Found ${images.length} images to check.`);

    let fixedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        console.log(`[${i+1}/${images.length}] Checking: ${file.bucket}/${file.path}`);

        try {
            // 1. Download
            const { data: blob, error: dlError } = await supabase.storage.from(file.bucket).download(file.path);
            if (dlError) throw dlError;
            
            const buffer = Buffer.from(await blob.arrayBuffer());

            // 2. Check metadata to see if it HAS an orientation tag
            const metadata = await sharp(buffer).metadata();
            
            // If orientation is defined and not 1, or if it has EXIF but we want to bake it
            if (metadata.orientation && metadata.orientation !== 1) {
                console.log(`  📐 Orientation found: ${metadata.orientation}. Fixing...`);
                
                const fixedBuffer = await sharp(buffer)
                    .rotate() // This uses the orientation tag to fix it
                    .toBuffer();

                // 3. Re-upload (Overwrite)
                const { error: ulError } = await supabase.storage.from(file.bucket).upload(file.path, fixedBuffer, {
                    upsert: true,
                    contentType: file.mimetype
                });

                if (ulError) throw ulError;
                console.log(`  ✅ Fixed and re-uploaded.`);
                fixedCount++;
            } else {
                // If it doesn't have an orientation tag but the user says it's wrong, 
                // it might have been ALREADY processed by a tool that stripped the tag but kept the pixels wrong.
                // In that case, there's no automatic way to know which way is "up".
                // We'll skip for now unless the user specifies which ones.
                // console.log(`  ⏭️ No orientation tag found (or already 1). Skipping.`);
            }

        } catch (err) {
            console.error(`  ❌ Error processing ${file.path}:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n✨ Correction Finished.`);
    console.log(`Total fixed: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);
}

fixOrientation();
