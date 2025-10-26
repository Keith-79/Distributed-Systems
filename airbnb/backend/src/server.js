const express = require('express');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session'); // new
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db');

const app = express();
console.log("[BOOT] entry:", __filename);
console.log("[BOOT] CORS_ORIGIN:", process.env.CORS_ORIGIN);


app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.set('etag', false); // disable ETag
app.use((req,res,next)=>{ res.setHeader('Cache-Control','no-store'); next(); });

// build MySQL session store
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  createDatabaseTable: true, // auto-create sessions table
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax', secure: false },
    store: sessionStore,
  })
);

// optional attachUser normalization
const attachUser = require('./middleware/attachUser');
app.use(attachUser);

// routes
app.use('/', require('./routes/health'));      // GET /health
app.use('/auth', require('./routes/auth'));    // POST /auth/signup|login|logout, GET /auth/me
app.use('/properties', require('./routes/properties'));
app.use('/bookings', require('./routes/bookings'));
app.use('/favourites', require('./routes/favourites'));
app.use('/meta', require('./routes/meta'));
app.use('/profile', require('./routes/profile'));

const path = require('path');
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const avatarsDir = path.join(imagesDir, 'avatars');
const propertiesDir = path.join(imagesDir, 'properties');
try { require('fs').mkdirSync(avatarsDir, { recursive: true }); } catch {}
try { require('fs').mkdirSync(propertiesDir, { recursive: true }); } catch {}
app.use('/images', express.static(imagesDir));




const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
