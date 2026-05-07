const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function download() {
    const { data, error } = await supabase.from('acts').select('web_gallery').ilike('name', '%slinky%');
    if (error || !data.length) {
        console.error(error || "No act found");
        return;
    }
    
    const gallery = data[0].web_gallery;
    const images = gallery.filter(i => i.type === 'image');
    
    const dir = 'samples/slinky_current';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    for (let i = 0; i < images.length; i++) {
        const url = images[i].url;
        console.log(`Downloading ${url}...`);
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const filename = `slinky_cur_${i+1}.jpg`;
            fs.writeFileSync(path.join(dir, filename), Buffer.from(response.data));
        } catch (e) {
            console.error(`Failed to download ${url}: ${e.message}`);
        }
    }
    console.log("Done.");
}

download();
