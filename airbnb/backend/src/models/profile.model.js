const { pool } = require('../db');

async function getProfileByUserId(userId){
  const [rows] = await pool.query(
    'SELECT user_id, phone, city, state_abbr AS state, country, languages, gender, about, avatar_url FROM profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (rows.length) return rows[0];
  await pool.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
  const [rows2] = await pool.query(
    'SELECT user_id, phone, city, state_abbr AS state, country, languages, gender, about, avatar_url FROM profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows2[0];
}

async function updateProfile(userId, payload){
  // map frontend 'state' -> DB column 'state_abbr'
  const mapped = { ...payload };
  if (Object.prototype.hasOwnProperty.call(mapped, 'state')) {
    mapped.state_abbr = mapped.state; delete mapped.state;
  }
  const allowed = ['phone','city','state_abbr','country','languages','gender','about','avatar_url'];
  const set = []; const vals = [];
  for (const k of allowed){ if (mapped[k] !== undefined){ set.push(`${k} = ?`); vals.push(mapped[k]); } }
  if (!set.length) return getProfileByUserId(userId);
  vals.push(userId);
  await pool.query(`UPDATE profiles SET ${set.join(', ')} WHERE user_id = ?`, vals);
  return getProfileByUserId(userId);
}

module.exports = { getProfileByUserId, updateProfile };


