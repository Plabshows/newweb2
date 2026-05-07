const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function download() {
    const { data, error } = await supabase.from('acts').select('web_gallery').ilike('name', '%slinky%');
    if (error) {
        console.error(error);
        return;
    }
    
    const gallery = data[0].web_gallery;
    const images = gallery.filter(i => i.type === 'image');
    
    if (!fs.existsSync('samples/slinky')) fs.mkdirSync('samples/slinky', { recursive: true });
    
    for (let i = 0; i < images.length; i++) {
        const url = images[i].url;
        console.log(`Downloading ${url}...`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const filename = `slinky${i+1}.jpg`;
        fs.writeFileSync(path.join('samples/slinky', filename), Buffer.from(response.data));
    }
    console.log("Done.");
}

download();
