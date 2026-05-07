import { put } from '@vercel/blob';
const sharp = require('sharp');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    let filename = form.get('filename') || 'upload';

    if (!file) {
      return response.status(400).json({ error: 'No file uploaded' });
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let contentType = file.type;

    // Image Optimization & Orientation Fix
    if (file.type.startsWith('image/')) {
      try {
        const optimized = await sharp(buffer)
          .rotate() // Auto-rotate based on EXIF
          .resize(1200, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        
        buffer = optimized;
        contentType = 'image/webp';
        
        // Ensure extension is webp
        if (!filename.endsWith('.webp')) {
          filename = filename.replace(/\.[^/.]+$/, "") + ".webp";
        }
      } catch (err) {
        console.error('Sharp optimization error:', err);
        // Fallback to original buffer if sharp fails
      }
    }

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: contentType,
      addRandomSuffix: true
    });

    return response.status(200).json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return response.status(500).json({ error: error.message });
  }
}
