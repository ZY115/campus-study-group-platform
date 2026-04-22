'use strict';

const express     = require('express');
const router      = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listGroups, getGroup, createGroup, updateGroup,
  joinGroup, leaveGroup, removeMember,
} = require('../controllers/groupController');
const { listComments, createComment } = require('../controllers/commentController');

// Public routes (no auth needed to browse)
router.get('/',    listGroups);
router.get('/:id', getGroup);

// Auth required
router.post('/',           requireRole('Organizer', 'Admin'), createGroup);
router.put('/:id',         requireAuth,                       updateGroup);
router.post('/:id/join',   requireAuth,                       joinGroup);
router.delete('/:id/leave',requireAuth,                       leaveGroup);
router.delete('/:id/members/:memberId', requireAuth,          removeMember);

// Comments (nested under group)
router.get('/:id/comments',  listComments);
router.post('/:id/comments', requireAuth, createComment);

module.exports = router;
