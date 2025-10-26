// src/routes/auth.js
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { findUserByEmail, findUserById, createUser } = require('../models/user.model');

const router = Router();

/**
 * POST /auth/signup
 * Creates a new user (traveler or owner)
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await createUser({ name, email, role, password_hash });

    // Start session
    req.session.userId = user.id;
    res.status(201).json({ user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 * Logs a user in
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/logout
 * Destroys current session
 */
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

/**
 * GET /auth/me
 * Returns the currently logged-in user
 */
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ user: null });
  const user = await findUserById(req.session.userId);
  res.json({ user });
});

module.exports = router;
