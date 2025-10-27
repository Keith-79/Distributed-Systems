const express = require('express');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session'); // new
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db');

const app = express();
console.log("[BOOT] entry:", __filename);
console.log("[BOOT] CORS_ORIGIN:", process.env.CORS_ORIGIN);


// Support multiple origins via comma-separated CORS_ORIGIN, with safe localhost defaults
const allowedOrigins = (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim())
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Express 5: avoid path-to-regexp '*' error; handle OPTIONS generically
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      return res.sendStatus(204);
    }
    return res.sendStatus(403);
  }
  return next();
});
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
