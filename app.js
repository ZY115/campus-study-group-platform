'use strict';

require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const path     = require('path');
const { db }   = require('./models');

const authRoutes         = require('./routes/auth');
const groupRoutes        = require('./routes/groups');
const joinRequestRoutes  = require('./routes/joinRequests');
const adminRoutes        = require('./routes/admin');
const userRoutes         = require('./routes/users');

const app = express();

// ─── Core Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'sgp-dev-secret-2026',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,           // set true in production with HTTPS
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000, // 1 day
  },
}));

// ─── Static Files ───────────────────────────────────────────────────────────
// Serve the entire mid-deliverable folder as the web root.
// HTML pages are at /pages/*.html, assets at /assets/*
app.use(express.static(path.join(__dirname, 'mid-deliverable')));

// Redirect bare root to home page
app.get('/', (_req, res) => res.redirect('/pages/index.html'));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/groups',        groupRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/users',         userRoutes);

// ─── 404 / Error Handlers ───────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.redirect('/pages/404.html');
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Boot ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

db.sync({ alter: true })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  StudyGroup WSU  →  http://localhost:${PORT}`);
      console.log(`  Database        →  ${process.env.DB_PATH || './data.sqlite'}`);
      console.log(`  Run seed data   →  npm run seed\n`);
    });
  })
  .catch(err => {
    console.error('Failed to sync database:', err);
    process.exit(1);
  });
