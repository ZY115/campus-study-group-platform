'use strict';

/**
 * models/index.js
 * Central entry point: exports db instance + all models with associations.
 * Associations define the relational structure used in every controller.
 */

const db          = require('../config/database');
const User        = require('./User');
const Group       = require('./Group');
const JoinRequest = require('./JoinRequest');
const Comment     = require('./Comment');

// ─── Associations ────────────────────────────────────────────────────────────

// Organizer → Groups (one-to-many)
User.hasMany(Group, { foreignKey: 'organizerId', as: 'createdGroups', onDelete: 'CASCADE' });
Group.belongsTo(User, { foreignKey: 'organizerId', as: 'organizer' });

// Members ↔ Groups (many-to-many via GroupMembers junction)
User.belongsToMany(Group, {
  through:    'GroupMembers',
  as:         'memberGroups',
  foreignKey: 'userId',
  otherKey:   'groupId',
});
Group.belongsToMany(User, {
  through:    'GroupMembers',
  as:         'groupMembers',
  foreignKey: 'groupId',
  otherKey:   'userId',
});

// JoinRequests
User.hasMany(JoinRequest, { foreignKey: 'userId', onDelete: 'CASCADE' });
JoinRequest.belongsTo(User, { foreignKey: 'userId', as: 'applicant' });

Group.hasMany(JoinRequest, { foreignKey: 'groupId', onDelete: 'CASCADE' });
JoinRequest.belongsTo(Group, { foreignKey: 'groupId' });

// Comments
Group.hasMany(Comment, { foreignKey: 'groupId', onDelete: 'CASCADE' });
Comment.belongsTo(Group, { foreignKey: 'groupId' });

User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = { db, User, Group, JoinRequest, Comment };
