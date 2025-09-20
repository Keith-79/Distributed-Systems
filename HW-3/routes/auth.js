// auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Demo user (OK for HW)
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('password', 8), name: 'Admin User' },
  { id: 2, username: 'Keith', password: bcrypt.hashSync('password', 8), name: 'Keith Gonsalves' }
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
  const courses = [
    { title: 'FA25: DATA-228 Sec 21 - Big Data Tech and Apps', term: 'Fall 2025', bgClass: 'bg-danger',   url: '#' },
    { title: 'FA25: DATA-236 Sec 21 & 71 - Distributed Systems', term: 'Fall 2025', bgClass: 'bg-secondary', url: '#' },
    { title: 'FA25: DATA-245 Sec 23 - Machine Learning',         term: 'Fall 2025', bgClass: 'bg-warning',  url: '#' }
  ];
  res.render('dashboard', { courses });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    // session is gone; show an info alert via query param on home
    res.redirect('/?logout=1');
  });
});

module.exports = router;
