const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function globalFix() {
    console.log('Fetching all acts...');
    const { data: acts, error } = await supabase.from('acts').select('name, web_gallery');
    
    if (error) {
        console.error('Error fetching acts:', error.message);
        return;
    }

    let fixCount = 0;
    for (const act of acts) {
        if (!act.web_gallery) continue;
        
        for (const item of act.web_gallery) {
            if (item.type !== 'image') continue;
            
            const url = item.url;
            if (!url.includes('supabase.co')) continue;
            
            const parts = url.split('/public/');
            if (parts.length < 2) continue;
            
            const subparts = parts[1].split('/');
            const bucket = subparts[0];
            const path = subparts.slice(1).join('/');

            // Only check 'media' bucket for now as 'web-media' seems okay, or just check everything
            try {
                // Quick check of current content-type via HEAD request
                const head = await axios.head(url).catch(() => null);
                if (head && head.headers['content-type'] === 'application/octet-stream') {
                    console.log(`Fixing ${act.name}: ${path}`);
                    
                    const response = await axios.get(url, { responseType: 'arraybuffer' });
                    const contentType = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                    
                    const { error: uploadError } = await supabase.storage
                        .from(bucket)
                        .upload(path, response.data, {
                            upsert: true,
                            contentType: contentType
                        });
                    
                    if (!uploadError) {
                        fixCount++;
                        console.log(`  Fixed!`);
                    } else {
                        console.error(`  Failed: ${uploadError.message}`);
                    }
                }
            } catch (e) {
                // Silently skip if error
            }
        }
    }
    console.log(`Finished. Fixed ${fixCount} images.`);
}

globalFix();
