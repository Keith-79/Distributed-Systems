const { Book } = require('../models');

exports.createBook = async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json(book);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

exports.getAllBooks = async (_req, res) => {
  const books = await Book.findAll();
  res.json(books);
};

exports.getBookById = async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
};

exports.updateBook = async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  await book.update(req.body);
  res.json(book);
};

exports.deleteBook = async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  await book.destroy();
  res.status(204).send();
};
