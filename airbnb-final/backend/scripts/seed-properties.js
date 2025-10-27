const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

(async function main() {
  const IMG_ROOT = process.env.SEED_IMG_ROOT || path.join(__dirname, '..', 'public', 'images', 'hotels');
  const OWNER_ID = Number(process.env.SEED_OWNER_ID || 1);
  const CITY = process.env.SEED_CITY || 'San Francisco';
  const COUNTRY = process.env.SEED_COUNTRY || 'USA';
  const TYPE = process.env.SEED_TYPE || 'apartment';
  const PRICE_MIN = Number(process.env.SEED_PRICE_MIN || 80);
  const PRICE_MAX = Number(process.env.SEED_PRICE_MAX || 300);

  console.log('[seed] reading from', IMG_ROOT);
  const files = fs.readdirSync(IMG_ROOT).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) {
    console.error('[seed] no images found in', IMG_ROOT);
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const file of files) {
      const nameNoExt = file.replace(/\.[^.]+$/, '');
      const price = (Math.random() * (PRICE_MAX - PRICE_MIN) + PRICE_MIN).toFixed(2);
      const capacity = Math.floor(Math.random() * 4) + 2; // 2..5
      const bathrooms = (Math.random() * 2 + 1).toFixed(1);
      const bedrooms = Math.floor(Math.random() * 3) + 1;

      const [propRes] = await conn.query(
        `INSERT INTO properties
         (owner_id, name, type, location_city, location_state, country,
          bedrooms, bathrooms, capacity, amenities, price_per_night, description)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [OWNER_ID, nameNoExt, TYPE, CITY, null, COUNTRY,
         bedrooms, bathrooms, capacity, null, price, `Auto-seeded listing: ${nameNoExt}`]
      );
      const propId = propRes.insertId;

      const relUrl = `/images/hotels/${file}`;
      await conn.query(
        `INSERT INTO property_photos (property_id, url, sort_order) VALUES (?,?,?)`,
        [propId, relUrl, 0]
      );
    }
    await conn.commit();
    console.log(`[seed] inserted ${files.length} properties and photos ✓`);
  } catch (e) {
    await conn.rollback();
    console.error('[seed] error:', e);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
