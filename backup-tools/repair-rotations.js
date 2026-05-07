const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const sharp = require('sharp');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targets = [
    {
        bucket: 'web-media',
        path: 'gallery/1776945723786-hr51aimbull.jpeg',
        url: 'https://nwxepstpedmxslbznejv.supabase.co/storage/v1/object/public/web-media/gallery/1776945723786-hr51aimbull.jpeg'
    },
    {
        bucket: 'web-media',
        path: 'gallery/1777384420986-9ga71x396dt.jpeg',
        url: 'https://nwxepstpedmxslbznejv.supabase.co/storage/v1/object/public/web-media/gallery/1777384420986-9ga71x396dt.jpeg'
    },
    {
        bucket: 'media',
        path: 'avatars/87f06c36-7dc7-4ce1-aa7f-e97c926ab998/gallery-1772047658395-amgc09',
        url: 'https://nwxepstpedmxslbznejv.supabase.co/storage/v1/object/public/media/avatars/87f06c36-7dc7-4ce1-aa7f-e97c926ab998/gallery-1772047658395-amgc09'
    },
    {
        bucket: 'media',
        path: 'avatars/87f06c36-7dc7-4ce1-aa7f-e97c926ab998/gallery-1772047679157-dq4yot',
        url: 'https://nwxepstpedmxslbznejv.supabase.co/storage/v1/object/public/media/avatars/87f06c36-7dc7-4ce1-aa7f-e97c926ab998/gallery-1772047679157-dq4yot'
    }
];

async function fix() {
    for (const target of targets) {
        console.log(`Processing ${target.url}...`);
        try {
            // 1. Download
            const response = await axios.get(target.url, { responseType: 'arraybuffer' });
            
            // 2. Rotate 90 deg CW
            // We also strip metadata to avoid any conflicting orientation flags
            const fixedBuffer = await sharp(Buffer.from(response.data))
                .rotate(90)
                .toBuffer();
            
            // 3. Upload back (overwrite)
            const { data, error } = await supabase.storage
                .from(target.bucket)
                .upload(target.path, fixedBuffer, {
                    upsert: true,
                    contentType: 'image/jpeg'
                });
            
            if (error) {
                console.error(`Failed to upload ${target.path}:`, error.message);
            } else {
                console.log(`Successfully fixed ${target.path}`);
            }
        } catch (e) {
            console.error(`Error processing ${target.url}:`, e.message);
        }
    }
}

fix();
