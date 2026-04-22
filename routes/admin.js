'use strict';

const express  = require('express');
const router   = express.Router();
const { requireRole } = require('../middleware/auth');
const {
  getStats, listUsers, updateUserStatus,
  listAllGroups, updateGroupStatus,
} = require('../controllers/adminController');

// All admin routes require Admin role
router.get('/stats',              requireRole('Admin'), getStats);
router.get('/users',              requireRole('Admin'), listUsers);
router.put('/users/:id/status',   requireRole('Admin'), updateUserStatus);
router.get('/groups',             requireRole('Admin'), listAllGroups);
router.put('/groups/:id/status',  requireRole('Admin'), updateGroupStatus);

module.exports = router;
