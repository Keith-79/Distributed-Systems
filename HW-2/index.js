// index.js — HW-2 Book Store (Express + EJS)

// Core
const express = require('express');
const path = require('path');

const app = express();

// Parse form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views + static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));     // absolute path = reliable
app.use(express.static(path.join(__dirname, 'public')));

// Simple request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Data — in memory
let books = [
  { BookID: "1", Title: "To Kill a Mockingbird", Author: "Harper Lee" },
  { BookID: "2", Title: "1984", Author: "George Orwell" },
  { BookID: "3", Title: "The Great Gatsby", Author: "F. Scott Fitzgerald" }
];

// Home (list)
app.get('/', (req, res) => {
  res.render('home', { books });
});

// ---------- CREATE ----------
app.get('/add-book', (req, res) => {
  res.render('create');
});

app.post('/add-book', (req, res) => {
  const { Title, Author } = req.body;
  if (!Title || !Author) return res.status(400).send('Both Title and Author are required');

  const maxId = books.length ? Math.max(...books.map(b => parseInt(b.BookID, 10))) : 0;
  const nextId = String(maxId + 1);
  books.push({ BookID: nextId, Title: Title.trim(), Author: Author.trim() });

  res.redirect('/');
});

// ---------- UPDATE (force ID=1) ----------
// Render the update view (send current books so we can build a dropdown)
app.get('/update-book', (req, res) => {
  res.render('update', { books });
});

// Update any book by ID using values from the form
app.post('/update-book', (req, res) => {
  const { BookID, Title, Author } = req.body;

  // find the book
  const target = books.find(b => b.BookID === String(BookID));
  if (target) {
    if (Title && Title.trim())  target.Title  = Title.trim();
    if (Author && Author.trim()) target.Author = Author.trim();
  }
  return res.redirect('/');
});


// ---------- DELETE (highest ID) ----------
app.get('/delete-book', (req, res) => {
  res.render('delete');
});

app.post('/delete-book', (req, res) => {
  if (!books.length) return res.redirect('/');
  const highest = Math.max(...books.map(b => parseInt(b.BookID, 10)));
  const idx = books.findIndex(b => parseInt(b.BookID, 10) === highest);
  if (idx !== -1) books.splice(idx, 1);
  res.redirect('/');
});

// Health (sanity)
app.get('/health', (req, res) => res.send('OK'));

// Global error handler (last middleware before listen)
app.use((err, req, res, next) => {
  console.error('ERROR:', err.stack || err);
  res.status(500).send('Something went wrong rendering this page.');
});

// Start
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
