'use strict';

/**
 * controllers/groupController.js
 * CRUD for Groups, plus Join / Leave actions.
 * All list responses include per-user context flags (isMember, isOrganizer, hasPendingRequest)
 * so the frontend can render buttons without additional client-side logic.
 */

const { Op }                        = require('sequelize');
const { Group, User, JoinRequest }  = require('../models');

/** Serialise a Group Sequelize instance into a plain API object. */
function serializeGroup(group, memberIds, userId, pendingGroupIds) {
  const uid = userId || null;
  return {
    id:               group.id,
    name:             group.name,
    course:           group.course,
    description:      group.description,
    visibility:       group.visibility,
    format:           group.format,
    location:         group.location     || '',
    meetingLink:      group.meetingLink  || '',
    schedule:         group.schedule,
    maxSize:          group.maxSize,
    tags:             group.tags,          // already parsed by model getter
    status:           group.status,
    reports:          group.reports,
    createdAt:        group.createdAt,
    organizerId:      group.organizerId,
    organizerName:    group.organizer?.name || '',
    members:          memberIds,
    memberCount:      memberIds.length,
    isMember:         uid ? memberIds.includes(uid)      : false,
    isOrganizer:      uid ? group.organizerId === uid    : false,
    hasPendingRequest:uid ? (pendingGroupIds?.has(group.id) ?? false) : false,
  };
}

/** Fetch pending-request group IDs for the current user (used in list queries). */
async function getPendingGroupIds(userId) {
  if (!userId) return new Set();
  const reqs = await JoinRequest.findAll({ where: { userId, status: 'pending' }, attributes: ['groupId'] });
  return new Set(reqs.map(r => r.groupId));
}

/**
 * GET /api/groups
 * Returns active groups (all groups for Admin).
 * Supports query params: format, visibility (comma-sep), search, sort
 */
async function listGroups(req, res) {
  try {
    const userId   = req.session.userId || null;
    const userRole = req.session.userRole || null;
    const { format, visibility, search, sort } = req.query;

    const where = {};
    if (userRole !== 'Admin') where.status = 'active';

    if (format && format !== 'all')  where.format = format;
    if (visibility) {
      const visArr = visibility.split(',').map(v => v.trim()).filter(Boolean);
      if (visArr.length) where.visibility = { [Op.in]: visArr };
    }
    if (search) {
      where[Op.or] = [
        { name:        { [Op.like]: `%${search}%` } },
        { course:      { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'name')    order = [['name',      'ASC']];
    if (sort === 'members') order = [['createdAt', 'DESC']]; // sorted post-fetch below

    const groups = await Group.findAll({
      where,
      include: [
        { model: User, as: 'organizer',    attributes: ['id', 'name'] },
        { model: User, as: 'groupMembers', attributes: ['id'], through: { attributes: [] } },
      ],
      order,
    });

    const pendingIds = await getPendingGroupIds(userId);

    let result = groups.map(g => {
      const memberIds = g.groupMembers.map(m => m.id);
      return serializeGroup(g, memberIds, userId, pendingIds);
    });

    if (sort === 'members') result.sort((a, b) => b.memberCount - a.memberCount);

    return res.json(result);
  } catch (err) {
    console.error('[listGroups]', err);
    return res.status(500).json({ error: 'Failed to fetch groups.' });
  }
}

/**
 * GET /api/groups/:id
 * Returns a single group with full member list.
 * Private groups: non-members only get limited info (gate screen).
 */
async function getGroup(req, res) {
  try {
    const userId   = req.session.userId || null;
    const userRole = req.session.userRole || null;

    const group = await Group.findByPk(req.params.id, {
      include: [
        { model: User, as: 'organizer',    attributes: ['id', 'name', 'major', 'avatar'] },
        { model: User, as: 'groupMembers', attributes: ['id', 'name', 'major', 'role'],
          through: { attributes: [] } },
      ],
    });

    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const memberIds  = group.groupMembers.map(m => m.id);
    const isMember   = userId ? memberIds.includes(userId) : false;
    const pendingIds = await getPendingGroupIds(userId);

    // Non-members of private groups get only public info
    const isPrivateGate = group.visibility === 'private' && !isMember && userRole !== 'Admin';

    const base = serializeGroup(group, memberIds, userId, pendingIds);

    if (isPrivateGate) {
      // Strip sensitive fields
      delete base.location;
      delete base.meetingLink;
      base.privateGate = true;
    } else {
      base.privateGate = false;
      // Include full member objects for detail view
      base.memberDetails = group.groupMembers.map(m => ({
        id:    m.id,
        name:  m.name,
        major: m.major,
        role:  m.role,
        avatar: m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        isOrganizer: m.id === group.organizerId,
      }));
    }

    return res.json(base);
  } catch (err) {
    console.error('[getGroup]', err);
    return res.status(500).json({ error: 'Failed to fetch group.' });
  }
}

/**
 * POST /api/groups
 * Creates a new group. Organizer/Admin only.
 * The creator is automatically added as a member.
 */
async function createGroup(req, res) {
  try {
    const userId = req.session.userId;
    const { name, course, description, visibility, format, location,
            meetingLink, schedule, maxSize, tags } = req.body;

    if (!name || !course || !description || !schedule) {
      return res.status(400).json({ error: 'name, course, description, and schedule are required.' });
    }

    const group = await Group.create({
      name, course, description,
      visibility:  visibility  || 'public',
      format:      format      || 'in-person',
      location:    location    || '',
      meetingLink: meetingLink || '',
      schedule,
      maxSize:     maxSize     || 10,
      tags:        tags        || [],
      status:      'active',
      organizerId: userId,
    });

    // Add creator as a member
    await group.addGroupMembers([userId]);

    // Reload with associations for response
    const full = await Group.findByPk(group.id, {
      include: [
        { model: User, as: 'organizer',    attributes: ['id', 'name'] },
        { model: User, as: 'groupMembers', attributes: ['id'], through: { attributes: [] } },
      ],
    });

    const memberIds = full.groupMembers.map(m => m.id);
    return res.status(201).json(serializeGroup(full, memberIds, userId, new Set()));
  } catch (err) {
    console.error('[createGroup]', err);
    return res.status(500).json({ error: 'Failed to create group.' });
  }
}

/**
 * PUT /api/groups/:id
 * Updates group details. Only the organizer or Admin can edit.
 */
async function updateGroup(req, res) {
  try {
    const userId   = req.session.userId;
    const userRole = req.session.userRole;

    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    if (group.organizerId !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only the organizer or admin can edit this group.' });
    }

    const allowed = ['name','description','schedule','location','meetingLink','maxSize','visibility','tags','status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) group[field] = req.body[field];
    });
    await group.save();

    const full = await Group.findByPk(group.id, {
      include: [
        { model: User, as: 'organizer',    attributes: ['id', 'name'] },
        { model: User, as: 'groupMembers', attributes: ['id'], through: { attributes: [] } },
      ],
    });
    const memberIds = full.groupMembers.map(m => m.id);
    return res.json(serializeGroup(full, memberIds, userId, new Set()));
  } catch (err) {
    console.error('[updateGroup]', err);
    return res.status(500).json({ error: 'Failed to update group.' });
  }
}

/**
 * POST /api/groups/:id/join
 * Public group  → adds user as member immediately.
 * Private group → creates a JoinRequest with status 'pending'.
 */
async function joinGroup(req, res) {
  try {
    const userId = req.session.userId;
    const group  = await Group.findByPk(req.params.id, {
      include: [{ model: User, as: 'groupMembers', attributes: ['id'], through: { attributes: [] } }],
    });
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.status !== 'active') return res.status(400).json({ error: 'This group is not active.' });

    const memberIds = group.groupMembers.map(m => m.id);
    if (memberIds.includes(userId)) {
      return res.status(409).json({ error: 'You are already a member of this group.' });
    }
    if (memberIds.length >= group.maxSize) {
      return res.status(400).json({ error: 'This group is full.' });
    }

    if (group.visibility === 'public') {
      await group.addGroupMembers([userId]);
      return res.json({ joined: true, message: `You have joined "${group.name}".` });
    }

    // Private group: create or return existing pending request
    const existing = await JoinRequest.findOne({
      where: { groupId: group.id, userId, status: 'pending' },
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending request for this group.' });
    }
    const request = await JoinRequest.create({
      groupId:  group.id,
      userId,
      message:  req.body.message || 'Requesting to join.',
      status:   'pending',
    });
    return res.status(201).json({ requested: true, requestId: request.id,
      message: `Join request sent to "${group.name}".` });
  } catch (err) {
    console.error('[joinGroup]', err);
    return res.status(500).json({ error: 'Join action failed.' });
  }
}

/**
 * DELETE /api/groups/:id/leave
 * Removes the current user from the group's member list.
 * The organizer cannot leave their own group.
 */
async function leaveGroup(req, res) {
  try {
    const userId = req.session.userId;
    const group  = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.organizerId === userId) {
      return res.status(400).json({ error: 'The organizer cannot leave their own group.' });
    }
    await group.removeGroupMembers([userId]);
    return res.json({ left: true, message: `You have left "${group.name}".` });
  } catch (err) {
    console.error('[leaveGroup]', err);
    return res.status(500).json({ error: 'Leave action failed.' });
  }
}

/**
 * DELETE /api/groups/:id/members/:memberId
 * Organizer removes a specific member from the group.
 */
async function removeMember(req, res) {
  try {
    const userId   = req.session.userId;
    const userRole = req.session.userRole;
    const group    = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.organizerId !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only the organizer can remove members.' });
    }
    const memberId = parseInt(req.params.memberId, 10);
    if (memberId === group.organizerId) {
      return res.status(400).json({ error: 'Cannot remove the organizer.' });
    }
    await group.removeGroupMembers([memberId]);
    return res.json({ removed: true });
  } catch (err) {
    console.error('[removeMember]', err);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
}

module.exports = { listGroups, getGroup, createGroup, updateGroup, joinGroup, leaveGroup, removeMember };
