// src/models/user.model.js
const { pool } = require('../db');

// find user by email
async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

// find user by ID
async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

// create a new user
async function createUser({ name, email, role, password_hash }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)',
    [name, email, role, password_hash]
  );
  return { id: result.insertId, name, email, role };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};
