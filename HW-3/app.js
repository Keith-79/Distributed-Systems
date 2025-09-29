require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const morgan = require('morgan');

const routes = require('./routes/auth'); 

const app = express();
const PORT = process.env.PORT || 3000;

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// sessions
app.set('trust proxy', 1);
app.use(session({
  name: 'ads.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: app.get('env') === 'production'
  }
}));

// expose session data to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.alert = req.session.alert || null;
  res.locals.sessionId = req.sessionID || null; 
  delete req.session.alert; 
  next();
});

app.use((req, res, next) => {
  if (!res.locals.alert && req.query.logout === '1') {
    res.locals.alert = { type: 'info', text: 'You have been logged out.' };
  }
  next();
});

// routes
app.use('/', routes);

// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
