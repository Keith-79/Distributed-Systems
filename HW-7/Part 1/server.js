// server.js (Mac version - test-friendly)
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// mount routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// optional Mongo connect (only if MONGODB_URI exists)
const mongoose = require('mongoose');

(async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
    } else {
      console.log('No MONGODB_URI set; tests will use in-memory MongoDB.');
    }
  } catch (e) {
    console.error('MongoDB connect error:', e.message);
  }
})();

// export app for tests
module.exports = app;

// start server when run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`server listening on ${port}`));
}
