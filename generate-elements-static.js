require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[SEO Script] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Skipping static generation.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const parseGallery = (data) => {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string' && data.trim() !== '') {
    try { return JSON.parse(data); } catch (e) { return []; }
  }
  return [];
};

const parseCategories = (cat, cats) => {
  let parsed = [];
  if (Array.isArray(cats)) parsed = cats;
  else if (typeof cats === 'string' && cats.trim() !== '') {
    try {
      parsed = JSON.parse(cats);
      if (!Array.isArray(parsed)) parsed = [cats];
    } catch (e) {
      parsed = cats.split(',').map(s => s.trim());
    }
  }
  const combined = [cat, ...parsed].filter(Boolean).map(c => String(c).trim());
  return [...new Set(combined)];
};

async function generateStaticHtml() {
  console.log('[SEO Script] Fetching performers from Supabase...');
  
  const [actsResult, charsResult] = await Promise.all([
    supabase.from('acts').select('*').eq('is_web_public', true),
    supabase.from('pld_characters').select('*').eq('is_web_public', true)
  ]);

  if (actsResult.error) {
    console.error('[SEO Script] Error fetching acts:', actsResult.error);
    process.exit(0);
  }
  if (charsResult.error) {
    console.error('[SEO Script] Error fetching characters:', charsResult.error);
    process.exit(0);
  }

  const acts = actsResult.data || [];
  const chars = charsResult.data || [];

  const mappedActs = acts.map(act => {
    const gallery = parseGallery(act.web_gallery || act.photos_url);
    let backupImage = act.image_url;
    if (gallery.length > 0) {
      backupImage = typeof gallery[0] === 'string' ? gallery[0] : (gallery[0].url || gallery[0].src);
    }
    const actName = act.web_custom_title || act.name || 'Unnamed Act';
    const finalSlug = act.slug || actName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      id: act.id,
      slug: finalSlug,
      name: actName,
      categories: parseCategories(act.category, act.categories),
      image: act.web_cover_image || backupImage || 'https://images.unsplash.com/photo-1598387181032-a3103ea7362a?auto=format&fit=crop&q=80&w=800',
      description: act.web_description || act.description || ''
    };
  });

  const mappedChars = chars.map(char => {
    const gallery = parseGallery(char.web_gallery);
    let backupImage = char.image;
    if (gallery.length > 0) {
      backupImage = typeof gallery[0] === 'string' ? gallery[0] : (gallery[0].url || gallery[0].src);
    }
    const charName = char.web_custom_title || char.name || 'Unnamed Character';
    const finalSlug = char.slug || charName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      id: char.id,
      slug: finalSlug,
      name: charName,
      categories: parseCategories(char.category, char.categories),
      image: char.web_cover_image || backupImage || 'https://images.unsplash.com/photo-1598387181032-a3103ea7362a?auto=format&fit=crop&q=80&w=800',
      description: char.web_description || char.description || ''
    };
  });

  const allElements = [...mappedActs, ...mappedChars].filter(el => el.name);
  
  // Group by category
  const grouped = {};
  allElements.forEach(el => {
    const mainCat = el.categories && el.categories.length > 0 && el.categories[0] !== '' ? el.categories[0] : 'PERFORMANCE';
    if (!grouped[mainCat]) grouped[mainCat] = [];
    grouped[mainCat].push(el);
  });

  // Sort categories and elements
  const sortedCategories = Object.keys(grouped).sort();
  
  let htmlString = `<div id="elements-static-seo" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);">\n`;
  
  let totalPerformers = 0;
  
  sortedCategories.forEach(cat => {
    htmlString += `  <h2>${cat}</h2>\n`;
    grouped[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(el => {
      totalPerformers++;
      htmlString += `  <article>\n`;
      htmlString += `    <h3>${el.name}</h3>\n`;
      htmlString += `    <p>${cat}</p>\n`;
      if (el.description) {
        htmlString += `    <p>${el.description}</p>\n`;
      }
      if (el.image) {
        htmlString += `    <img src="${el.image}" alt="${el.name} — ${cat} performer, Performance Lab Ibiza" />\n`;
      }
      htmlString += `  </article>\n`;
    });
  });
  
  htmlString += `</div>`;

  const htmlFilePath = path.join(__dirname, 'the-elements.html');
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

  const startMarker = '<!-- INJECT_STATIC_SEO_START -->';
  const endMarker = '<!-- INJECT_STATIC_SEO_END -->';

  const startIndex = htmlContent.indexOf(startMarker);
  const endIndex = htmlContent.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const before = htmlContent.substring(0, startIndex + startMarker.length);
    const after = htmlContent.substring(endIndex);
    htmlContent = `${before}\n${htmlString}\n${after}`;
  } else {
    console.warn('[SEO Script] Could not find injection markers in the-elements.html. Did you add them?');
    process.exit(1);
  }

  // Handle JSON-LD Schema updating
  let schemaString = `
<script type="application/ld+json" id="seo-schema">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Entertainment Acts & Performers | Performance Lab",
  "description": "Curated roster of elite Ibiza performers — circus acts, live bands, immersive characters & fire shows.",
  "itemListElement": [
${allElements.map((el, i) => `    {
      "@type": "ListItem",
      "position": ${i + 1},
      "item": {
        "@type": "Person",
        "name": ${JSON.stringify(el.name)},
        "jobTitle": ${JSON.stringify(el.categories[0] || 'Performer')},
        "description": ${JSON.stringify(el.description || '')},
        "url": "https://performancelab.es/show-details.html?show=${el.slug}",
        "image": ${JSON.stringify(el.image)}
      }
    }`).join(',\n')}
  ]
}
</script>`;

  const schemaStartMarker = '<!-- INJECT_SCHEMA_START -->';
  const schemaEndMarker = '<!-- INJECT_SCHEMA_END -->';
  const schemaStartIndex = htmlContent.indexOf(schemaStartMarker);
  const schemaEndIndex = htmlContent.indexOf(schemaEndMarker);

  if (schemaStartIndex !== -1 && schemaEndIndex !== -1) {
    const before = htmlContent.substring(0, schemaStartIndex + schemaStartMarker.length);
    const after = htmlContent.substring(schemaEndIndex);
    htmlContent = `${before}\n${schemaString}\n${after}`;
  }

  // Inject Gemini API Key if available
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    htmlContent = htmlContent.replace(/const apiKey = ".*"; \/\/ GEMINI_API_KEY/g, `const apiKey = "${GEMINI_API_KEY}"; // GEMINI_API_KEY`);
    console.log('[SEO Script] Gemini API Key injected.');
  }

  fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
  console.log(`[SEO Script] Successfully injected ${totalPerformers} performers across ${sortedCategories.length} categories.`);
}

generateStaticHtml().catch(err => {
  console.error('[SEO Script] Unhandled error:', err);
});
