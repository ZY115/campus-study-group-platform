'use strict';

/**
 * controllers/commentController.js
 * GET and POST comments for a group's discussion thread.
 * Only group members (and Admin) may post comments.
 */

const { Comment, User, Group } = require('../models');

/**
 * GET /api/groups/:id/comments
 * Returns all comments for a group, ordered oldest-first.
 */
async function listComments(req, res) {
  try {
    const comments = await Comment.findAll({
      where: { groupId: req.params.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.json(comments.map(c => ({
      id:        c.id,
      groupId:   c.groupId,
      userId:    c.userId,
      userName:  c.author?.name || 'Unknown',
      text:      c.text,
      createdAt: c.createdAt,
    })));
  } catch (err) {
    console.error('[listComments]', err);
    return res.status(500).json({ error: 'Failed to fetch comments.' });
  }
}

/**
 * POST /api/groups/:id/comments
 * Creates a comment. Requires the current user to be a member or Admin.
 */
async function createComment(req, res) {
  try {
    const userId   = req.session.userId;
    const userRole = req.session.userRole;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty.' });
    }

    const group = await Group.findByPk(req.params.id, {
      include: [{ model: User, as: 'groupMembers', attributes: ['id'], through: { attributes: [] } }],
    });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const memberIds = group.groupMembers.map(m => m.id);
    if (!memberIds.includes(userId) && userRole !== 'Admin') {
      return res.status(403).json({ error: 'You must be a member to post in this group.' });
    }

    const comment = await Comment.create({ groupId: group.id, userId, text: text.trim() });
    const author  = await User.findByPk(userId, { attributes: ['id', 'name'] });

    return res.status(201).json({
      id:        comment.id,
      groupId:   comment.groupId,
      userId:    comment.userId,
      userName:  author?.name || '',
      text:      comment.text,
      createdAt: comment.createdAt,
    });
  } catch (err) {
    console.error('[createComment]', err);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
}

module.exports = { listComments, createComment };
