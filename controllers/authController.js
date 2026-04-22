'use strict';

/**
 * controllers/authController.js
 * Handles user registration, login, logout, and session retrieval.
 * Passwords are hashed with bcryptjs (salt rounds = 10).
 */

const bcrypt     = require('bcryptjs');
const { User }   = require('../models');

/** Formats a User record for safe API responses (strips password). */
function safeUser(user) {
  return {
    id:        user.id,
    name:      user.name,
    email:     user.email,
    role:      user.role,
    major:     user.major,
    bio:       user.bio,
    status:    user.status,
    avatar:    user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    createdAt: user.createdAt,
  };
}

/**
 * POST /api/auth/register
 * Creates a new account and logs the user in automatically.
 */
async function register(req, res) {
  try {
    const { name, email, password, role, major } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (!email.endsWith('@wsu.edu')) {
      return res.status(400).json({ error: 'Must use a WSU email address (@wsu.edu).' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({
      name,
      email,
      password: hashed,
      role:     ['Admin', 'Organizer', 'Participant'].includes(role) ? role : 'Participant',
      major:    major || '',
    });

    req.session.userId   = user.id;
    req.session.userRole = user.role;

    return res.status(201).json(safeUser(user));
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
}

/**
 * POST /api/auth/login
 * Validates email + password, creates session on success.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'No account found with that email.' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'This account has been suspended. Contact an administrator.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    req.session.userId   = user.id;
    req.session.userRole = user.role;

    return res.json(safeUser(user));
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
}

/**
 * POST /api/auth/logout
 * Destroys the session.
 */
function logout(req, res) {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully.' });
  });
}

/**
 * GET /api/auth/me
 * Returns the currently logged-in user from session.
 * Returns 401 if not authenticated (used by frontend initApp).
 */
async function me(req, res) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session user not found.' });
    }
    return res.json(safeUser(user));
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Failed to fetch session user.' });
  }
}

module.exports = { register, login, logout, me };
