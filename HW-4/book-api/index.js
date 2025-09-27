require('dotenv').config();
const express = require('express');
const app = express();
const { sequelize } = require('./models');
const bookRoutes = require('./routes/book.routes');

app.use(express.json());
app.get('/', (_req, res) => res.send('Book API is running'));
app.use('/api/books', bookRoutes);

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to MySQL');
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
  } catch (err) {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }
})();
