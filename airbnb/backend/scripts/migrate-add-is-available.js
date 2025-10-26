/*
  Adds is_available column to properties if it doesn't exist.
  Usage: node backend/scripts/migrate-add-is-available.js
*/

const { pool } = require('../src/db');

async function main() {
  const [cols] = await pool.query(`SHOW COLUMNS FROM properties LIKE 'is_available'`);
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE properties ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1 AFTER description`);
    console.log('Added is_available to properties');
  } else {
    console.log('is_available already exists');
  }
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(1); });


