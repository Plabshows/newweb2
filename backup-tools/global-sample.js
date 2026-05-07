const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sample() {
    const outputDir = 'samples/global_audit';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log('Fetching acts...');
    const { data: acts, error } = await supabase.from('acts').select('name, web_gallery');
    
    if (error) {
        console.error(error);
        return;
    }

    const mapping = [];
    let count = 0;

    for (const act of acts) {
        const images = (act.web_gallery || []).filter(i => i.type === 'image');
        if (images.length === 0) continue;

        const url = images[0].url;
        const ext = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
        const filename = `act_${count}.${ext}`;
        const filepath = path.join(outputDir, filename);

        console.log(`Downloading ${act.name} -> ${filename}`);
        try {
            const response = await axios.get(url, { responseType: 'stream' });
            response.data.pipe(fs.createWriteStream(filepath));
            
            mapping.push({
                index: count,
                name: act.name,
                url: url,
                file: filename
            });
            count++;
        } catch (e) {
            console.error(`  Failed to download ${act.name}: ${e.message}`);
        }
    }

    fs.writeFileSync(path.join(outputDir, 'mapping.json'), JSON.stringify(mapping, null, 2));
    console.log(`Sampled ${count} acts.`);
}

sample();
