const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'delicious_food_kitchen_4.html');
const imageDir = path.join(root, 'public', 'images', 'menu');
const attributionPath = path.join(imageDir, 'ATTRIBUTION.json');

const pageTerms = {
  'Veg Spring Rolls': 'Spring roll',
  'Hara Bhara Kabab': 'Hara bhara kabab',
  'Crispy Corn': 'Corn kernels',
  'Mushroom Pepper Fry': 'Mushroom dish',
  'Prawn Fry': 'Prawn dish',
  'Mutton Seekh Kabab': 'Seekh kebab',
  'Veg Fried Rice': 'Fried rice',
  'Veg Hakka Noodles': 'Hakka noodles',
  'Mushroom Masala': 'Mushroom curry',
  'Chicken Fried Rice': 'Fried rice',
  'Chicken Noodles': 'Hakka noodles',
  'Egg Curry': 'Egg curry',
  'Chicken Pizza': 'Pizza',
  'Paneer Tikka Pizza': 'Pizza',
  'Pasta Alfredo': 'Fettuccine Alfredo',
  'Chicken Pasta': 'Pasta',
  'Veg Burger': 'Veggie burger',
  'Chicken Burger': 'Chicken sandwich',
  'Grilled Sandwich': 'Sandwich',
  'Club Sandwich': 'Club sandwich',
  'Chicken Soup': 'Chicken soup',
  'Fresh Lime Soda': 'Lime soda',
  'Masala Chai': 'Masala chai',
  'Cold Coffee': 'Iced coffee',
  'Fresh Juice': 'Fruit juice',
  'Soft Drinks': 'Soft drink',
  'North Indian Veg Thali': 'Thali',
  'South Indian Meals': 'South Indian cuisine',
  'Masala Dosa': 'Masala dosa',
  'Idli Vada Combo': 'Idli',
  'Hyderabadi Dum Biryani': 'Hyderabadi biryani'
};

const commonsTerms = {
  'Paneer Tikka': 'paneer tikka food',
  'Veg Spring Rolls': 'spring rolls food',
  'Hara Bhara Kabab': 'hara bhara kabab food',
  'Crispy Corn': 'crispy corn food',
  'Mushroom Pepper Fry': 'mushroom pepper fry food',
  'Chicken 65': 'chicken 65 dish',
  'Chicken Wings': 'chicken wings food',
  'Fish Fingers': 'fish fingers food',
  'Prawn Fry': 'prawn fry food',
  'Mutton Seekh Kabab': 'seekh kebab food',
  'Paneer Butter Masala': 'paneer butter masala',
  'Dal Makhani': 'dal makhani',
  'Veg Biryani': 'vegetable biryani',
  'Palak Paneer': 'palak paneer',
  'Veg Fried Rice': 'vegetable fried rice',
  'Chole Bhature': 'chole bhature',
  'Veg Hakka Noodles': 'hakka noodles food',
  'Mushroom Masala': 'mushroom curry food',
  'Butter Chicken': 'butter chicken',
  'Chicken Biryani': 'chicken biryani',
  'Mutton Rogan Josh': 'rogan josh',
  'Fish Curry': 'fish curry',
  'Prawn Masala': 'prawn curry',
  'Chicken Fried Rice': 'chicken fried rice',
  'Chicken Noodles': 'chicken noodles food',
  'Egg Curry': 'egg curry',
  'Margherita Pizza': 'margherita pizza',
  'Chicken Pizza': 'chicken pizza',
  'Paneer Tikka Pizza': 'paneer pizza',
  'Pasta Alfredo': 'alfredo pasta',
  'Chicken Pasta': 'chicken pasta food',
  'Veg Burger': 'veggie burger',
  'Chicken Burger': 'chicken burger',
  'Grilled Sandwich': 'grilled sandwich',
  'Club Sandwich': 'club sandwich',
  'Caesar Salad': 'caesar salad',
  'Greek Salad': 'greek salad',
  'Tomato Soup': 'tomato soup',
  'Chicken Soup': 'chicken soup',
  'Gulab Jamun': 'gulab jamun',
  'Chocolate Brownie': 'chocolate brownie',
  'Ice Cream': 'ice cream bowl',
  'Rasmalai': 'ras malai',
  'Tiramisu': 'tiramisu',
  'Cheesecake': 'cheesecake',
  'Mango Lassi': 'mango lassi',
  'Fresh Lime Soda': 'lime soda drink',
  'Masala Chai': 'masala chai',
  'Cold Coffee': 'iced coffee',
  'Fresh Juice': 'fresh fruit juice',
  'Soft Drinks': 'soft drink glass',
  'North Indian Veg Thali': 'north indian thali',
  'South Indian Meals': 'south indian meal',
  'Masala Dosa': 'masala dosa',
  'Idli Vada Combo': 'idli vada',
  'Hyderabadi Dum Biryani': 'hyderabadi biryani'
};

const blockedTitleTerms = [
  'logo',
  'map',
  'flag',
  'icon',
  'diagram',
  'poster',
  'text',
  'packaging',
  'packet',
  'sign'
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractDefaultMenu(html) {
  const start = html.indexOf('const DEFAULT_MENU=[');
  if (start === -1) throw new Error('DEFAULT_MENU not found');

  const arrayStart = html.indexOf('[', start);
  const arrayEnd = html.indexOf('];', arrayStart);
  if (arrayEnd === -1) throw new Error('DEFAULT_MENU closing bracket not found');

  const arrayLiteral = html.slice(arrayStart, arrayEnd + 1);
  return Function(`return ${arrayLiteral};`)();
}

function extFromContentType(contentType) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SVAD-Restaurant-local-image-updater/1.0 (local development)'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function findWikipediaImage(item) {
  const term = pageTerms[item.name] || item.name;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  const data = await fetchJson(url);
  const image = data.originalimage?.source || data.thumbnail?.source;
  if (!image) return null;

  return {
    url: image,
    source: data.content_urls?.desktop?.page || url,
    title: data.title || term,
    provider: 'Wikipedia'
  };
}

async function findCommonsImage(item) {
  const term = commonsTerms[item.name] || `${item.name} food`;
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '10',
    gsrsearch: term,
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '900',
    format: 'json',
    origin: '*'
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = Object.values(data.query?.pages || {});
  const page = pages.find((candidate) => {
    const title = String(candidate.title || '').toLowerCase();
    const info = candidate.imageinfo?.[0];
    return info
      && info.thumburl
      && /^image\/(jpeg|png|webp)$/.test(info.mime || '')
      && !blockedTitleTerms.some(term => title.includes(term));
  });

  if (!page) return null;

  return {
    url: page.imageinfo[0].thumburl,
    source: page.imageinfo[0].descriptionurl || page.imageinfo[0].url,
    title: page.title,
    provider: 'Wikimedia Commons'
  };
}

function findKeywordFallbackImage(item) {
  const term = (commonsTerms[item.name] || `${item.name} food`)
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(',');

  return {
    url: `https://loremflickr.com/900/520/${encodeURIComponent(term)},food`,
    source: `https://loremflickr.com/`,
    title: `${item.name} keyword food photo`,
    provider: 'LoremFlickr/Flickr keyword search'
  };
}

async function downloadImage(item, found) {
  const response = await fetch(found.url, {
    headers: {
      'User-Agent': 'SVAD-Restaurant-local-image-updater/1.0 (local development)'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const ext = extFromContentType(contentType);
  const filename = `${item.id}-${slugify(item.name)}${ext}`;
  const destination = path.join(imageDir, filename);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);

  return {
    path: `/images/menu/${filename}`,
    bytes: buffer.length,
    contentType
  };
}

function replaceImagePath(html, item, imagePath) {
  const idPattern = item.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockPattern = new RegExp(`(\\{id:'${idPattern}'[\\s\\S]*?img:')([^']+)(')`);
  return html.replace(blockPattern, `$1${imagePath}$3`);
}

async function main() {
  await fs.mkdir(imageDir, { recursive: true });
  let html = await fs.readFile(htmlPath, 'utf8');
  const menu = extractDefaultMenu(html);
  const attributions = [];
  const failures = [];

  for (const item of menu) {
    try {
      let found = null;
      try {
        found = await findWikipediaImage(item);
      } catch (_) {
        found = null;
      }
      if (!found) {
        try {
          found = await findCommonsImage(item);
        } catch (_) {
          found = null;
        }
      }
      if (!found) {
        found = findKeywordFallbackImage(item);
      }

      let downloaded;
      try {
        downloaded = await downloadImage(item, found);
      } catch (error) {
        if (found.provider === 'LoremFlickr/Flickr keyword search') {
          throw error;
        }
        found = findKeywordFallbackImage(item);
        downloaded = await downloadImage(item, found);
      }
      html = replaceImagePath(html, item, downloaded.path);
      attributions.push({
        id: item.id,
        dish: item.name,
        localPath: downloaded.path,
        sourceTitle: found.title,
        sourceUrl: found.source,
        provider: found.provider
      });
      console.log(`✓ ${item.name} -> ${downloaded.path}`);
    } catch (error) {
      failures.push({ id: item.id, dish: item.name, error: error.message });
      console.warn(`! ${item.name}: ${error.message}`);
    }
  }

  await fs.writeFile(htmlPath, html);
  await fs.writeFile(attributionPath, JSON.stringify({ generatedAt: new Date().toISOString(), attributions, failures }, null, 2));

  if (failures.length) {
    console.warn(`Finished with ${failures.length} image fallback(s).`);
  }
  console.log(`Updated ${attributions.length} menu images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
