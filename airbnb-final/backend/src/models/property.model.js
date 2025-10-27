// backend/src/models/property.model.js
const { pool } = require('../db');

// Bedrooms → Bathrooms normalization
function calculateBathrooms(bedrooms) {
  const b = Number(bedrooms || 0);
  if (b <= 2) return 1;
  if (b <= 4) return 2;
  return 3;
}

// Guests/capacity normalization based on bedrooms
function calculateCapacity(bedrooms, capacity) {
  const b = Number(bedrooms || 0);
  const hardMax = b > 0 ? b * 3 : 2; // cap guests ≤ bedrooms × 3 (studios max 2)
  const logical = b <= 1 ? 2 : b * 2; // default ≈ bedrooms × 2 (studios max 2)
  const provided = Number(capacity || 0);
  if (provided > 0) return Math.min(provided, hardMax);
  return Math.min(logical, hardMax);
}

/** List properties (lightweight list for cards) */
async function listProperties({ city, country, min_price, max_price, type, guests, sort, page = 1, page_size = 20, viewer_id = null } = {}) {
  const params = [];
  let sql = `
    SELECT
      p.id,
      p.owner_id,
      p.name,
      p.type,
      p.location_city,
      p.location_state,
      p.country,
      p.bedrooms,
      p.bathrooms,
      p.capacity,
      p.amenities,
      p.price_per_night,
      p.description,
      p.created_at,
      (
        SELECT url FROM property_photos ph
        WHERE ph.property_id = p.id
        ORDER BY ph.sort_order ASC, ph.id ASC
        LIMIT 1
      ) AS thumbnailUrl,
      (
        SELECT 1 FROM favourites f
        WHERE f.property_id = p.id AND f.traveler_id = ?
        LIMIT 1
      ) AS isFavourited,
      u.name AS owner_name,
      u.id   AS owner_user_id
    FROM properties p
    JOIN users u ON u.id = p.owner_id
  `;
  params.push(viewer_id || 0);
  const where = [];
  if (city && String(city).trim().length >= 2) {
    const q = `%${String(city)}%`;
    where.push('('+ 
      'p.location_city COLLATE utf8mb4_general_ci LIKE ? OR '+
      'p.country COLLATE utf8mb4_general_ci LIKE ? OR '+
      'p.name COLLATE utf8mb4_general_ci LIKE ?'+
    ')');
    params.push(q, q, q);
  }
  if (country) { where.push('LOWER(p.country) LIKE ?'); params.push(`%${String(country).toLowerCase()}%`); }
  if (min_price !== undefined && min_price !== '') { where.push('p.price_per_night >= ?'); params.push(Number(min_price)); }
  if (max_price !== undefined && max_price !== '') { where.push('p.price_per_night <= ?'); params.push(Number(max_price)); }
  if (type) { where.push('LOWER(p.type) = ?'); params.push(String(type).toLowerCase()); }
  if (guests !== undefined && guests !== '' && Number(guests) > 0) { where.push('p.capacity >= ?'); params.push(Number(guests)); }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  // sort
  if (sort === 'price_asc') sql += ' ORDER BY p.price_per_night ASC, p.created_at DESC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price_per_night DESC, p.created_at DESC';
  else sql += ' ORDER BY p.created_at DESC';

  // pagination with hard cap of first 100 results
  page = Math.max(1, Number(page) || 1);
  page_size = Math.min(50, Math.max(1, Number(page_size) || 20));
  let offset = (page - 1) * page_size;
  if (offset >= 100) {
    const [empty] = await pool.query(sql + ' LIMIT 0', params);
    return empty;
  }
  const effectiveLimit = Math.min(page_size, 100 - offset);
  sql += ' LIMIT ? OFFSET ?';
  params.push(effectiveLimit, offset);

  const [rows] = await pool.query(sql, params);

  return rows.map((row) => {
    let amenities = row.amenities;
    if (typeof amenities === 'string') {
      try { amenities = JSON.parse(amenities); } catch {}
    }
    return {
      ...row,
      amenities,
      title: row.name,
      city: row.location_city,
      state: row.location_state,
      bathrooms: calculateBathrooms(row.bedrooms),
      capacity: calculateCapacity(row.bedrooms, row.capacity),
      owner: { id: row.owner_user_id, first_name: String(row.owner_name||'').split(' ')[0] || row.owner_name }
    };
  });
}

/** Count properties matching filters (for pagination UI) */
async function countProperties({ city, country, min_price, max_price, type, guests } = {}) {
  const params = [];
  let sql = `SELECT COUNT(*) AS total FROM properties p`;
  const where = [];
  if (city) {
    const q = `%${String(city)}%`;
    where.push('('+ 
      'p.location_city COLLATE utf8mb4_general_ci LIKE ? OR '+
      'p.country COLLATE utf8mb4_general_ci LIKE ? OR '+
      'p.name COLLATE utf8mb4_general_ci LIKE ?'+
    ')');
    params.push(q, q, q);
  }
  if (country) { where.push('LOWER(p.country) LIKE ?'); params.push(`%${String(country).toLowerCase()}%`); }
  if (min_price !== undefined && min_price !== '') { where.push('p.price_per_night >= ?'); params.push(Number(min_price)); }
  if (max_price !== undefined && max_price !== '') { where.push('p.price_per_night <= ?'); params.push(Number(max_price)); }
  if (type) { where.push('LOWER(p.type) = ?'); params.push(String(type).toLowerCase()); }
  if (guests !== undefined && guests !== '' && Number(guests) > 0) { where.push('p.capacity >= ?'); params.push(Number(guests)); }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.query(sql, params);
  return rows[0]?.total || 0;
}

/** Single property (full) */
async function getProperty(id) {
  const [rows] = await pool.query(`SELECT p.*, u.name AS owner_name, u.id AS owner_user_id FROM properties p JOIN users u ON u.id = p.owner_id WHERE p.id = ?`, [id]);
  const row = rows[0] || null;
  if (!row) return null;

  let amenities = row.amenities;
  if (typeof amenities === 'string') {
    try { amenities = JSON.parse(amenities); } catch {}
  }
  const [photos] = await pool.query(
    `SELECT url FROM property_photos WHERE property_id = ? ORDER BY sort_order ASC, id ASC`,
    [id]
  );
  const urls = photos.map((p) => p.url);
  return {
    ...row,
    amenities,
    title: row.name,
    city: row.location_city,
    state: row.location_state,
    bathrooms: calculateBathrooms(row.bedrooms),
    capacity: calculateCapacity(row.bedrooms, row.capacity),
    owner: { id: row.owner_user_id, first_name: String(row.owner_name||'').split(' ')[0] || row.owner_name },
    photos: urls,
    thumbnailUrl: urls[0] || null,
  };
}

/** Create property */
async function createProperty(data) {
  const {
    owner_id, name, type, location_city, location_state, country,
    bedrooms = 1, bathrooms = null, capacity = 2, amenities = null,
    price_per_night, description = null
  } = data;
  const normalizedBathrooms = bathrooms != null ? bathrooms : calculateBathrooms(bedrooms);
  const normalizedCapacity  = calculateCapacity(bedrooms, capacity);

  const [result] = await pool.query(
    `INSERT INTO properties
     (owner_id, name, type, location_city, location_state, country,
      bedrooms, bathrooms, capacity, amenities, price_per_night, description, is_available)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      owner_id, name, type, location_city, location_state, country,
      bedrooms, normalizedBathrooms, normalizedCapacity,
      amenities ? JSON.stringify(amenities) : null,
      price_per_night, description, data.is_available != null ? Number(Boolean(data.is_available)) : 1
    ]
  );

  return getProperty(result.insertId);
}

/** Owner’s properties */
async function listMyProperties(owner_id) {
  const [rows] = await pool.query(
    `SELECT 
       p.*,
       (
         SELECT url FROM property_photos ph
         WHERE ph.property_id = p.id
         ORDER BY ph.sort_order ASC, ph.id ASC
         LIMIT 1
       ) AS thumbnailUrl
     FROM properties p
     WHERE p.owner_id = ?
     ORDER BY p.created_at DESC`,
    [owner_id]
  );
  return rows.map((row) => ({
    ...row,
    title: row.name,
    city: row.location_city,
    state: row.location_state,
  }));
}

module.exports = {
  createProperty,
  listProperties,
  getProperty,
  listMyProperties,
  countProperties,
  updateProperty,
};

// Debug: show what we export when required
if (require.main !== module) {
  // eslint-disable-next-line no-console
  console.log('[property.model exports]', Object.keys(module.exports));
}

/** Update property (owner only, route validates ownership separately) */
async function updateProperty({ id, owner_id, data }) {
  const fields = [];
  const params = [];
  const allowed = ['name','type','location_city','location_state','country','bedrooms','bathrooms','capacity','amenities','price_per_night','description','is_available'];
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      if (k === 'amenities' && data[k] != null && typeof data[k] !== 'string') {
        fields.push(`${k} = ?`); params.push(JSON.stringify(data[k]));
      } else {
        fields.push(`${k} = ?`); params.push(data[k]);
      }
    }
  }
  if (!fields.length) return await getProperty(id);
  // normalize dependent fields
  if (!('bathrooms' in data) && 'bedrooms' in data) {
    fields.push('bathrooms = ?'); params.push(calculateBathrooms(data.bedrooms));
  }
  if (!('capacity' in data) && 'bedrooms' in data) {
    fields.push('capacity = ?'); params.push(calculateCapacity(data.bedrooms, data.capacity));
  }
  params.push(id, owner_id);
  const sql = `UPDATE properties SET ${fields.join(', ')} WHERE id = ? AND owner_id = ?`;
  const [r] = await pool.query(sql, params);
  if (r.affectedRows === 0) return null;
  return await getProperty(id);
}
