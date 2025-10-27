/*
  Seed randomized properties from a flat images folder.

  Usage:
  SEED_OWNER_ID=1 \
  SEED_IMG_ROOT="/absolute/path/to/backend/public/images/hotels" \
  node -r dotenv/config ./scripts/seed-global-flat-images.js dotenv_config_path=./.env

  Prereqs:
  - Images placed under backend/public/images/hotels/*.jpg (or png/webp)
  - Server serves /images → backend/public/images (already configured)
*/

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

const DESTINATIONS = [
  { city: 'New York', country: 'USA', cost: 'high' },
  { city: 'San Francisco', country: 'USA', cost: 'high' },
  { city: 'Los Angeles', country: 'USA', cost: 'high' },
  { city: 'Miami', country: 'USA', cost: 'mid' },
  { city: 'Austin', country: 'USA', cost: 'mid' },
  { city: 'Seattle', country: 'USA', cost: 'mid' },
  { city: 'Chicago', country: 'USA', cost: 'mid' },
  { city: 'Vancouver', country: 'Canada', cost: 'high' },
  { city: 'Toronto', country: 'Canada', cost: 'high' },
  { city: 'Mexico City', country: 'Mexico', cost: 'low' },
  { city: 'Tulum', country: 'Mexico', cost: 'mid' },
  { city: 'London', country: 'United Kingdom', cost: 'high' },
  { city: 'Paris', country: 'France', cost: 'high' },
  { city: 'Nice', country: 'France', cost: 'mid' },
  { city: 'Amsterdam', country: 'Netherlands', cost: 'high' },
  { city: 'Barcelona', country: 'Spain', cost: 'mid' },
  { city: 'Madrid', country: 'Spain', cost: 'mid' },
  { city: 'Lisbon', country: 'Portugal', cost: 'mid' },
  { city: 'Porto', country: 'Portugal', cost: 'mid' },
  { city: 'Rome', country: 'Italy', cost: 'mid' },
  { city: 'Florence', country: 'Italy', cost: 'mid' },
  { city: 'Venice', country: 'Italy', cost: 'high' },
  { city: 'Milan', country: 'Italy', cost: 'high' },
  { city: 'Athens', country: 'Greece', cost: 'mid' },
  { city: 'Santorini', country: 'Greece', cost: 'high' },
  { city: 'Berlin', country: 'Germany', cost: 'mid' },
  { city: 'Munich', country: 'Germany', cost: 'mid' },
  { city: 'Prague', country: 'Czechia', cost: 'mid' },
  { city: 'Vienna', country: 'Austria', cost: 'mid' },
  { city: 'Budapest', country: 'Hungary', cost: 'low' },
  { city: 'Dubrovnik', country: 'Croatia', cost: 'mid' },
  { city: 'Edinburgh', country: 'United Kingdom', cost: 'mid' },
  { city: 'Dublin', country: 'Ireland', cost: 'high' },
  { city: 'Reykjavik', country: 'Iceland', cost: 'high' },
  { city: 'Tokyo', country: 'Japan', cost: 'high' },
  { city: 'Kyoto', country: 'Japan', cost: 'high' },
  { city: 'Seoul', country: 'South Korea', cost: 'mid' },
  { city: 'Singapore', country: 'Singapore', cost: 'high' },
  { city: 'Bangkok', country: 'Thailand', cost: 'low' },
  { city: 'Phuket', country: 'Thailand', cost: 'low' },
  { city: 'Bali', country: 'Indonesia', cost: 'low' },
  { city: 'Hanoi', country: 'Vietnam', cost: 'low' },
  { city: 'Ho Chi Minh City', country: 'Vietnam', cost: 'low' },
  { city: 'Hong Kong', country: 'China (SAR)', cost: 'high' },
  { city: 'Taipei', country: 'Taiwan', cost: 'mid' },
  { city: 'Kuala Lumpur', country: 'Malaysia', cost: 'low' },
  { city: 'Sydney', country: 'Australia', cost: 'high' },
  { city: 'Melbourne', country: 'Australia', cost: 'mid' },
  { city: 'Auckland', country: 'New Zealand', cost: 'high' },
  { city: 'Queenstown', country: 'New Zealand', cost: 'high' },
  { city: 'Dubai', country: 'UAE', cost: 'high' },
  { city: 'Tel Aviv', country: 'Israel', cost: 'high' },
  { city: 'Doha', country: 'Qatar', cost: 'high' },
  { city: 'Marrakech', country: 'Morocco', cost: 'low' },
  { city: 'Cape Town', country: 'South Africa', cost: 'mid' },
  { city: 'Zanzibar', country: 'Tanzania', cost: 'low' },
  { city: 'Rio de Janeiro', country: 'Brazil', cost: 'mid' },
  { city: 'São Paulo', country: 'Brazil', cost: 'mid' },
  { city: 'Buenos Aires', country: 'Argentina', cost: 'low' },
  { city: 'Santiago', country: 'Chile', cost: 'mid' },
  { city: 'Lima', country: 'Peru', cost: 'low' },
];

const TYPES = ['Apartment','House','Villa','Studio','Cabin','Loft','Condo'];
const ADJECTIVES = ['Charming','Modern','Cozy','Elegant','Spacious','Sunny','Quiet','Stylish','Boutique','Urban','Scenic','Riverside','Garden','Historic'];
const NOUNS = ['Retreat','Hideaway','Residence','Suites','Loft','Flat','Getaway','Nook','Abode','Lodge','Haven','Sanctuary'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.round(min + Math.random() * (max - min)); }
function priceFor(cost) { return cost === 'low' ? randInt(40,140) : cost === 'mid' ? randInt(80,240) : randInt(150,420); }
function capacity() { return randInt(2,8); }
function bedrooms() { return randInt(1,4); }
function bathrooms() { return (Math.random() * 2 + 1).toFixed(1); }
function randomTitle(type, city) {
  const adj = rand(ADJECTIVES);
  const noun = rand(NOUNS);
  return `${adj} ${type} ${noun} in ${city}`;
}

(async function main() {
  const IMG_ROOT = process.env.SEED_IMG_ROOT || '/Users/keith/Downloads/hotel_images';
  const OWNER_ID = Number(process.env.SEED_OWNER_ID || 1);
  const MAX_COUNT = 100;

  let files = fs.readdirSync(IMG_ROOT)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) {
    console.error('[seed-global] No images found at', IMG_ROOT);
    process.exit(1);
  }
  // randomize and cap to 100
  files = files.sort(() => Math.random() - 0.5).slice(0, MAX_COUNT);

  const destDir = path.join(__dirname, '..', 'public', 'images', 'properties');
  try { fs.mkdirSync(destDir, { recursive: true }); } catch {}

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let count = 0;
    for (const f of files) {
      const dest = rand(DESTINATIONS);
      const type = rand(TYPES);
      const price = priceFor(dest.cost);
      const cap = capacity();
      const bdr = bedrooms();
      const bth = bathrooms();
      const title = randomTitle(type, dest.city);
      const desc = `${type} • Bright and thoughtfully designed space in the heart of ${dest.city}, ${dest.country}. Seamless self check‑in, fast Wi‑Fi, fully equipped kitchen, and walkable to top attractions.`;

      const [r] = await conn.query(
        `INSERT INTO properties
         (owner_id, name, type, location_city, location_state, country,
          bedrooms, bathrooms, capacity, amenities, price_per_night, description)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [OWNER_ID, title, type.toLowerCase(), dest.city, null, dest.country,
         bdr, bth, cap, null, price, desc]
      );
      const propertyId = r.insertId;

      // copy image into backend/public/images/properties with a unique name
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}_${f}`;
      const srcPath = path.join(IMG_ROOT, f);
      const dstPath = path.join(destDir, unique);
      fs.copyFileSync(srcPath, dstPath);
      const url = `/images/properties/${unique}`;
      await conn.query(
        `INSERT INTO property_photos (property_id, url, sort_order) VALUES (?,?,?)`,
        [propertyId, url, 0]
      );
      count++;
    }
    await conn.commit();
    console.log(`[seed-global] Inserted ${count} properties with photos ✓`);
  } catch (e) {
    await conn.rollback();
    console.error('[seed-global] Failed, rolled back:', e);
    process.exit(1);
  } finally {
    (await conn).release?.();
    process.exit(0);
  }
})();


