/*
  Backfill a random photo for properties that don't have any photo.
  Usage:
    SEED_IMG_ROOT="/Users/keith/Downloads/hotel_images" \
    node -r dotenv/config ./scripts/backfill-missing-photos.js dotenv_config_path=./.env
*/
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main(){
  const IMG_ROOT = process.env.SEED_IMG_ROOT || '/Users/keith/Downloads/hotel_images';
  const files = fs.readdirSync(IMG_ROOT).filter(f=>/\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) { console.error('No images found at', IMG_ROOT); process.exit(1); }
  const destDir = path.join(__dirname, '..', 'public', 'images', 'properties');
  try { fs.mkdirSync(destDir, { recursive: true }); } catch {}

  const [rows] = await pool.query(`
    SELECT p.id
    FROM properties p
    LEFT JOIN property_photos ph ON ph.property_id = p.id
    WHERE ph.id IS NULL
    ORDER BY p.id ASC
  `);

  let count = 0;
  for (const r of rows){
    const f = files[Math.floor(Math.random()*files.length)];
    const src = path.join(IMG_ROOT, f);
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}_${f}`;
    const dst = path.join(destDir, unique);
    fs.copyFileSync(src, dst);
    const url = `/images/properties/${unique}`;
    await pool.query(`INSERT INTO property_photos (property_id, url, sort_order) VALUES (?,?,0)`, [r.id, url]);
    count++;
  }
  console.log(`[backfill] Added photos for ${count} properties`);
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });


