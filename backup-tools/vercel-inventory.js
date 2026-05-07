const { list } = require('@vercel/blob');
require('dotenv').config({ path: '../.env.local' });

async function run() {
    console.log("Listing Vercel Blob files...");
    let allBlobs = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
        const { blobs, cursor: nextCursor } = await list({
            token: process.env.BLOB_READ_WRITE_TOKEN,
            cursor: cursor
        });
        
        allBlobs = allBlobs.concat(blobs);
        cursor = nextCursor;
        hasMore = !!cursor;
        console.log(`- Fetched ${allBlobs.length} items...`);
    }
    
    console.log(`Found ${allBlobs.length} total files in Vercel Blob.`);
    const fs = require('fs');
    fs.writeFileSync('vercel-inventory.json', JSON.stringify(allBlobs, null, 2));
    console.log("Vercel inventory saved.");
}

run();
