// auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Demo user (OK for HW)
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('password', 8), name: 'Admin User' },
  { id: 2, username: 'Keith', password: '$2b$10$..fOzh5RHyS5VyPTX7yVA.zZjOmJQ2pdSVQtpF4HNI95i5uAIwWPa', name: 'Keith Gonsalves' }
];

// Protect routes
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  req.session.alert = { type: 'warning', text: 'Please log in to continue.' };
  return res.redirect('/login');
}

// Home
router.get('/', (req, res) => {
  res.render('home');
});

// Login (GET)
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login');
});

// Login (POST)
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = { id: user.id, username: user.username, name: user.name || user.username };
    req.session.alert = { type: 'success', text: `Welcome, ${req.session.user.username}!` };
    return res.redirect('/dashboard');
  }

  req.session.alert = { type: 'danger', text: 'Invalid username or password.' };
  return res.redirect('/login');
});

// Dashboard (protected)
router.get('/dashboard', requireLogin, (req, res) => {
  res.render('dashboard');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    // session is gone; show an info alert via query param on home
    res.redirect('/?logout=1');
  });
});

module.exports = router;
