'use strict';

const express  = require('express');
const router   = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMe, updateMe } = require('../controllers/userController');

router.get('/me',  requireAuth, getMe);
router.put('/me',  requireAuth, updateMe);

module.exports = router;
