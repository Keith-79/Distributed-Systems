const express = require('express');
const router = express.Router();
const c = require('../controllers/book.controller');

router.post('/', c.createBook);
router.get('/', c.getAllBooks);
router.get('/:id', c.getBookById);
router.put('/:id', c.updateBook);
router.delete('/:id', c.deleteBook);

module.exports = router;
