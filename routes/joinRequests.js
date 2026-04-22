'use strict';

const express  = require('express');
const router   = express.Router();
const { requireRole } = require('../middleware/auth');
const { listRequests, updateRequest } = require('../controllers/joinRequestController');

router.get('/',    requireRole('Organizer', 'Admin'), listRequests);
router.put('/:id', requireRole('Organizer', 'Admin'), updateRequest);

module.exports = router;
