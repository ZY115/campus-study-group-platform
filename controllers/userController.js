'use strict';

/**
 * controllers/userController.js
 * Current-user profile read/update and dashboard data aggregation.
 */

const { User, Group, JoinRequest } = require('../models');

/**
 * GET /api/users/me
 * Returns the current user's full profile plus dashboard summary data.
 */
async function getMe(req, res) {
  try {
    const userId = req.session.userId;
    const user   = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const joinedGroups   = await Group.findAll({
      include: [{ model: User, as: 'groupMembers', where: { id: userId },
                  attributes: [], through: { attributes: [] } }],
      where: { status: 'active' },
    });
    const createdGroups  = await Group.findAll({ where: { organizerId: userId } });
    const myRequests     = await JoinRequest.findAll({
      where: { userId },
      include: [{ model: Group, attributes: ['id', 'name'] }],
      order: [['requestedAt', 'DESC']],
    });

    return res.json({
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      major:     user.major,
      bio:       user.bio,
      status:    user.status,
      avatar:    user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      createdAt: user.createdAt,
      stats: {
        joinedCount:   joinedGroups.length,
        createdCount:  createdGroups.length,
        requestsCount: myRequests.length,
        pendingCount:  myRequests.filter(r => r.status === 'pending').length,
      },
      joinedGroups:  joinedGroups.map(g => ({
        id: g.id, name: g.name, course: g.course, format: g.format,
        schedule: g.schedule, status: g.status,
      })),
      createdGroups: createdGroups.map(g => ({
        id: g.id, name: g.name, course: g.course, status: g.status,
        memberCount: 0, // lightweight — no need for full join here
      })),
      requests: myRequests.map(r => ({
        id: r.id, groupId: r.groupId, groupName: r.Group?.name || '',
        status: r.status, requestedAt: r.requestedAt, message: r.message,
      })),
    });
  } catch (err) {
    console.error('[getMe]', err);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
}

/**
 * PUT /api/users/me
 * Updates the current user's name, major, and bio.
 */
async function updateMe(req, res) {
  try {
    const userId = req.session.userId;
    const user   = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { name, major, bio } = req.body;
    if (name  !== undefined) user.name  = name.trim();
    if (major !== undefined) user.major = major.trim();
    if (bio   !== undefined) user.bio   = bio.trim();
    await user.save();

    return res.json({
      id: user.id, name: user.name, email: user.email,
      role: user.role, major: user.major, bio: user.bio,
      avatar: user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    });
  } catch (err) {
    console.error('[updateMe]', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

module.exports = { getMe, updateMe };
