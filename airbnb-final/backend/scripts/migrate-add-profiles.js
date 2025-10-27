/*
  Creates profiles table if it doesn't exist.
  Usage: node backend/scripts/migrate-add-profiles.js
*/
const { pool } = require('../src/db');

async function main(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      phone VARCHAR(50) NULL,
      city VARCHAR(100) NULL,
      state VARCHAR(100) NULL,
      state_abbr VARCHAR(8) NULL,
      country VARCHAR(100) NULL,
      languages VARCHAR(255) NULL,
      gender VARCHAR(50) NULL,
      about TEXT NULL,
      avatar_url VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('profiles table ensured');
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });


