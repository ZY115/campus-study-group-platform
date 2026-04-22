'use strict';

/**
 * middleware/auth.js
 * Route-level guards for authentication and role-based access control.
 * Used by all protected API routes.
 */

/** Rejects request if no active session (not logged in). */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/**
 * Rejects request if session role is not in the allowed list.
 * Always implies requireAuth — no need to chain separately.
 * Usage: router.get('/admin', requireRole('Admin'), controller)
 *        router.post('/create', requireRole('Organizer', 'Admin'), controller)
 */
function requireRole(...roles) {
  return [
    requireAuth,
    (req, res, next) => {
      if (!roles.includes(req.session.userRole)) {
        return res.status(403).json({
          error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.session.userRole}`,
        });
      }
      next();
    },
  ];
}

module.exports = { requireAuth, requireRole };
