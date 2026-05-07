const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

// Use SERVICE_ROLE_KEY for move operations
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function renameFiles() {
    console.log("🛠 Renaming malformed files in Supabase Storage...");
    
    if (!fs.existsSync('supabase-inventory.json')) {
        console.error("❌ Inventory not found.");
        return;
    }

    const inventory = JSON.parse(fs.readFileSync('supabase-inventory.json', 'utf8'));
    
    const toRename = inventory.filter(f => f.path.includes('.blob'));

    console.log(`Found ${toRename.length} files to rename.`);

    let renamedCount = 0;
    let errorCount = 0;

    for (const file of toRename) {
        // Find the index of .blob
        let cleanPath = file.path.split('.blob')[0];
        
        // Ensure we don't end with a dot if the original extension was before .blob
        // (Though usually the extension is part of the filename before .blob)
        
        console.log(`⏳ Moving: ${file.path} -> ${cleanPath}`);

        try {
            const { error } = await supabase.storage.from(file.bucket).move(file.path, cleanPath);
            
            if (error) {
                if (error.message.includes('The resource already exists')) {
                    console.log(`  ⚠️  Clean file already exists. Skipping.`);
                } else {
                    throw error;
                }
            } else {
                console.log(`  ✅ Success.`);
                renamedCount++;
            }
        } catch (err) {
            console.error(`  ❌ Error:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n✨ Finished.`);
    console.log(`Renamed: ${renamedCount}`);
    console.log(`Errors: ${errorCount}`);
}

renameFiles();
