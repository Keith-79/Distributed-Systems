// src/models/favourite.model.js
const { pool } = require('../db');

/** returns true if favourite exists */
async function existsFavourite(traveler_id, property_id) {
  const [rows] = await pool.query(
    `SELECT 1 FROM favourites WHERE traveler_id=? AND property_id=? LIMIT 1`,
    [traveler_id, property_id]
  );
  return rows.length > 0;
}

/** toggle favourite; returns { nowFavourited: boolean } */
async function toggleFavourite(traveler_id, property_id) {
  if (await existsFavourite(traveler_id, property_id)) {
    await pool.query(`DELETE FROM favourites WHERE traveler_id=? AND property_id=?`,
      [traveler_id, property_id]);
    return { nowFavourited: false };
  } else {
    await pool.query(`INSERT INTO favourites (traveler_id, property_id) VALUES (?, ?)`,
      [traveler_id, property_id]);
    return { nowFavourited: true };
  }
}

/** list traveller's favourites with property details */
async function listMyFavourites(traveler_id) {
  const [rows] = await pool.query(
    `SELECT f.property_id, f.created_at,
            p.*, u.name AS owner_name,
            (
              SELECT url FROM property_photos ph
              WHERE ph.property_id = p.id
              ORDER BY ph.sort_order ASC, ph.id ASC
              LIMIT 1
            ) AS thumbnailUrl
     FROM favourites f
     JOIN properties p ON p.id = f.property_id
     JOIN users u ON u.id = p.owner_id
     WHERE f.traveler_id = ?
     ORDER BY f.created_at DESC`,
    [traveler_id]
  );
  return rows;
}

module.exports = { toggleFavourite, listMyFavourites, existsFavourite };
