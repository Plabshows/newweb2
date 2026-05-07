const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    // Acts to fix
    const actNames = ['Slinky Man', 'Hedge Men'];
    
    for (const name of actNames) {
        console.log(`Checking act: ${name}`);
        const { data: acts, error } = await supabase.from('acts').select('web_gallery').ilike('name', `%${name}%`);
        
        if (error || !acts.length) continue;
        
        const gallery = acts[0].web_gallery;
        for (const item of gallery) {
            if (item.type !== 'image') continue;
            
            const url = item.url;
            if (!url.includes('supabase.co')) continue;
            
            // Extract bucket and path
            // Format: .../public/BUCKET/PATH
            const parts = url.split('/public/');
            if (parts.length < 2) continue;
            
            const subparts = parts[1].split('/');
            const bucket = subparts[0];
            const path = subparts.slice(1).join('/');
            
            console.log(`Checking ${url} (Bucket: ${bucket}, Path: ${path})`);
            
            try {
                // Download to get the buffer
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                
                // Re-upload with correct content-type
                const contentType = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(path, response.data, {
                        upsert: true,
                        contentType: contentType
                    });
                
                if (uploadError) {
                    console.error(`  Failed to fix ${path}:`, uploadError.message);
                } else {
                    console.log(`  Successfully fixed content-type for ${path} to ${contentType}`);
                }
            } catch (e) {
                console.error(`  Error processing ${url}:`, e.message);
            }
        }
    }
}

fix();
