'use strict';

/**
 * controllers/joinRequestController.js
 * Handles listing, approving, and rejecting join requests.
 * Organizers see requests for their groups; Admins see all.
 */

const { JoinRequest, Group, User } = require('../models');

/** Serialise a JoinRequest for API responses. */
function serializeRequest(req) {
  return {
    id:          req.id,
    groupId:     req.groupId,
    groupName:   req.Group?.name   || '',
    userId:      req.userId,
    userName:    req.applicant?.name  || '',
    userEmail:   req.applicant?.email || '',
    status:      req.status,
    message:     req.message,
    requestedAt: req.requestedAt,
  };
}

/**
 * GET /api/join-requests
 * Organizer → requests for their own groups only.
 * Admin     → all requests.
 * Optional query: groupId, status
 */
async function listRequests(req, res) {
  try {
    const userId   = req.session.userId;
    const userRole = req.session.userRole;
    const { groupId, status } = req.query;

    const where = {};
    if (status) where.status = status;

    if (userRole === 'Admin') {
      if (groupId) where.groupId = groupId;
    } else {
      // Organizer: only their groups
      const myGroups = await Group.findAll({
        where: { organizerId: userId },
        attributes: ['id'],
      });
      const myGroupIds = myGroups.map(g => g.id);
      if (groupId) {
        // Validate they own the requested group
        if (!myGroupIds.includes(parseInt(groupId, 10))) {
          return res.status(403).json({ error: 'You do not own this group.' });
        }
        where.groupId = groupId;
      } else {
        if (!myGroupIds.length) return res.json([]);
        where.groupId = myGroupIds;
      }
    }

    const requests = await JoinRequest.findAll({
      where,
      include: [
        { model: User,  as: 'applicant', attributes: ['id', 'name', 'email'] },
        { model: Group,                  attributes: ['id', 'name'] },
      ],
      order: [['requestedAt', 'DESC']],
    });

    return res.json(requests.map(serializeRequest));
  } catch (err) {
    console.error('[listRequests]', err);
    return res.status(500).json({ error: 'Failed to fetch join requests.' });
  }
}

/**
 * PUT /api/join-requests/:id
 * Body: { status: 'approved' | 'rejected' }
 * On approval: adds the applicant to the group's member list.
 */
async function updateRequest(req, res) {
  try {
    const userId   = req.session.userId;
    const userRole = req.session.userRole;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected".' });
    }

    const request = await JoinRequest.findByPk(req.params.id, {
      include: [
        { model: User,  as: 'applicant', attributes: ['id', 'name', 'email'] },
        { model: Group,                  attributes: ['id', 'name', 'organizerId'] },
      ],
    });
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    // Validate ownership
    if (request.Group.organizerId !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Only the group organizer or admin can act on this request.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed.' });
    }

    request.status = status;
    await request.save();

    if (status === 'approved') {
      const group = await Group.findByPk(request.groupId);
      if (group) await group.addGroupMembers([request.userId]);
    }

    return res.json(serializeRequest(request));
  } catch (err) {
    console.error('[updateRequest]', err);
    return res.status(500).json({ error: 'Failed to update request.' });
  }
}

module.exports = { listRequests, updateRequest };
