require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// helper: sign token with standard claims
function signToken(doc) {
  const payload = { id: doc._id.toString(), username: doc.username, role: doc.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRY });
}

// REGISTER
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password required' });
  }
  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ message: 'user already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.create({ username, password: hash, role: role || 'user' });
    return res.status(201).json({ message: 'registered', username: user.username, role: user.role });
  } catch {
    return res.status(500).json({ message: 'registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'invalid credentials' });

    const token = signToken(user);
    return res.status(200).json({ message: 'login ok', token, expiresIn: process.env.TOKEN_EXPIRY });
  } catch {
    return res.status(500).json({ message: 'login failed' });
  }
});

// ADMIN-ONLY SAMPLE
router.get('/protected/admin-data', verifyToken, (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'admin role required' });
  }
  return res.status(200).json({ message: 'admin ok', who: req.user.username });
});

// *** REQUIRED NEW ROUTE: user OR admin allowed ***
router.get('/protected/user-status', verifyToken, (req, res) => {
  const allowed = new Set(['user', 'admin']);
  const role = req.user?.role;
  if (!role || !allowed.has(role)) {
    return res.status(403).json({ message: 'user or admin required' });
  }
  return res.status(200).json({ message: 'user-status ok', claims: req.user });
});

const requireRole = require('../middleware/requireRole');

router.get('/protected/admin-data',
  verifyToken,
  requireRole(['admin']),
  (req, res) => res.status(200).json({ message: 'admin ok', who: req.user.username })
);

router.get('/protected/user-status',
  verifyToken,
  requireRole(['user','admin']),
  (req, res) => res.status(200).json({ message: 'user-status ok', claims: req.user })
);

module.exports = router;
