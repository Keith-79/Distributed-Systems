// auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// --- demo user store (OK for HW) ---
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('password', 8), name: 'Admin User' }
];

// --- middleware to protect routes ---
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  req.session.alert = { type: 'warning', text: 'Please log in to continue.' };
  return res.redirect('/login');
}

// --- Home ---
router.get('/', (req, res) => {
  // we'll create views/home.ejs in the next step
  res.render('home');
});

// --- Login (GET) ---
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login');
});

// --- Login (POST) ---
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = { id: user.id, username: user.username, name: user.name || user.username };
    req.session.alert = { type: 'success', text: `Welcome, ${req.session.user.username}!` };
    return res.redirect('/dashboard');
  }
  req.session.alert = { type: 'danger', text: 'Invalid username or password.' };
  res.redirect('/login');
});

// --- Dashboard (protected) ---
router.get('/dashboard', requireLogin, (req, res) => {
  res.render('dashboard');
});

// --- Logout ---
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
