'use strict';

/**
 * controllers/adminController.js
 * Admin-only operations: platform statistics, user banning, group moderation.
 * All routes are protected by requireRole('Admin') in routes/admin.js.
 */

const { User, Group, JoinRequest, Comment } = require('../models');

/** Safe user serialisation (no password). */
function safeUser(u) {
  return {
    id:        u.id,
    name:      u.name,
    email:     u.email,
    role:      u.role,
    major:     u.major,
    bio:       u.bio,
    status:    u.status,
    avatar:    u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    createdAt: u.createdAt,
  };
}

/**
 * GET /api/admin/stats
 * Returns aggregate platform statistics for the Admin Dashboard.
 */
async function getStats(req, res) {
  try {
    const [totalUsers, activeUsers, bannedUsers, totalGroups, activeGroups, removedGroups,
           totalRequests, pendingRequests, totalComments] = await Promise.all([
      User.count(),
      User.count({ where: { status: 'active' } }),
      User.count({ where: { status: 'banned' } }),
      Group.count(),
      Group.count({ where: { status: 'active' } }),
      Group.count({ where: { status: 'removed' } }),
      JoinRequest.count(),
      JoinRequest.count({ where: { status: 'pending' } }),
      Comment.count(),
    ]);

    // Groups with reports > 0
    const reportedGroups = await Group.count({ where: { reports: { [require('sequelize').Op.gt]: 0 } } });

    return res.json({
      totalUsers, activeUsers, bannedUsers,
      totalGroups, activeGroups, removedGroups, reportedGroups,
      totalRequests, pendingRequests,
      totalComments,
    });
  } catch (err) {
    console.error('[getStats]', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

/**
 * GET /api/admin/users
 * Returns all users. Supports optional search query param.
 */
async function listUsers(req, res) {
  try {
    const { search, role, status } = req.query;
    const where = {};
    const { Op } = require('sequelize');

    if (role   && role   !== 'all') where.role   = role;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { major: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await User.findAll({ where, order: [['createdAt', 'ASC']] });
    return res.json(users.map(safeUser));
  } catch (err) {
    console.error('[listUsers]', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

/**
 * PUT /api/admin/users/:id/status
 * Body: { action: 'ban' | 'unban' }
 * Prevents banning the Admin's own account.
 */
async function updateUserStatus(req, res) {
  try {
    const { action } = req.body;
    if (!['ban', 'unban'].includes(action)) {
      return res.status(400).json({ error: 'action must be "ban" or "unban".' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Protect the Admin account from being banned
    if (user.role === 'Admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be banned.' });
    }

    user.status = action === 'ban' ? 'banned' : 'active';
    await user.save();
    return res.json(safeUser(user));
  } catch (err) {
    console.error('[updateUserStatus]', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
}

/**
 * GET /api/admin/groups
 * Returns ALL groups (including removed) for moderation view.
 */
async function listAllGroups(req, res) {
  try {
    const { Op } = require('sequelize');
    const { search, status, format, visibility } = req.query;
    const where = {};

    if (status     && status !== 'all')     where.status     = status;
    if (format     && format !== 'all')     where.format     = format;
    if (visibility && visibility !== 'all') where.visibility = visibility;
    if (search) {
      where[Op.or] = [
        { name:   { [Op.like]: `%${search}%` } },
        { course: { [Op.like]: `%${search}%` } },
      ];
    }

    const groups = await Group.findAll({
      where,
      include: [
        { model: User, as: 'organizer',    attributes: ['id', 'name'] },
        { model: User, as: 'groupMembers', attributes: ['id'], through: { attributes: [] } },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json(groups.map(g => ({
      id:            g.id,
      name:          g.name,
      course:        g.course,
      description:   g.description,
      visibility:    g.visibility,
      format:        g.format,
      location:      g.location,
      meetingLink:   g.meetingLink,
      schedule:      g.schedule,
      maxSize:       g.maxSize,
      tags:          g.tags,
      status:        g.status,
      reports:       g.reports,
      createdAt:     g.createdAt,
      organizerId:   g.organizerId,
      organizerName: g.organizer?.name || '',
      memberCount:   g.groupMembers.length,
      members:       g.groupMembers.map(m => m.id),
    })));
  } catch (err) {
    console.error('[listAllGroups]', err);
    return res.status(500).json({ error: 'Failed to fetch groups.' });
  }
}

/**
 * PUT /api/admin/groups/:id/status
 * Body: { status: 'active' | 'removed' }
 */
async function updateGroupStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['active', 'removed'].includes(status)) {
      return res.status(400).json({ error: 'status must be "active" or "removed".' });
    }

    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    group.status = status;
    await group.save();
    return res.json({ id: group.id, status: group.status, name: group.name });
  } catch (err) {
    console.error('[updateGroupStatus]', err);
    return res.status(500).json({ error: 'Failed to update group status.' });
  }
}

module.exports = { getStats, listUsers, updateUserStatus, listAllGroups, updateGroupStatus };
