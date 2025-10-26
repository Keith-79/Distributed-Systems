/*
  Seed randomized amenities for existing properties.
  Usage:
    node backend/scripts/seed-amenities.js
*/

const { pool } = require('../src/db');

const CATALOG = ['wifi','kitchen','tv','ac','pool','pet_friendly'];

function sample(array, count) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function pickForType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'villa') {
    // villas should usually have a pool
    const rest = CATALOG.filter(k => k !== 'pool');
    const others = sample(rest, 4 + Math.floor(Math.random()*2)); // 4-5 others
    return ['pool', ...others].slice(0, 6);
  }
  if (t === 'studio') {
    // compact set without pool
    const rest = CATALOG.filter(k => k !== 'pool');
    return sample(rest, 4 + Math.floor(Math.random()*2)); // 4-5
  }
  // apartment/house
  const base = CATALOG.slice();
  return sample(base, 5 + Math.floor(Math.random()*2)); // 5-6
}

async function main() {
  const [rows] = await pool.query(`SELECT id, type, amenities FROM properties ORDER BY id`);
  let updated = 0;
  for (const row of rows) {
    let needsUpdate = false;
    let current = row.amenities;
    if (typeof current === 'string') {
      try { current = JSON.parse(current); } catch { current = null; }
    }
    if (!Array.isArray(current) || current.length === 0) {
      const pick = pickForType(row.type);
      await pool.query(`UPDATE properties SET amenities = ? WHERE id = ?`, [JSON.stringify(pick), row.id]);
      updated++;
    }
  }
  console.log(`[seed-amenities] Updated ${updated} properties`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


