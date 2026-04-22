'use strict';

const { DataTypes } = require('sequelize');
const db = require('../config/database');

const JoinRequest = db.define('JoinRequest', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  // groupId and userId added via associations
  status: {
    type:         DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull:    false,
  },
  message: {
    type:         DataTypes.TEXT,
    defaultValue: '',
  },
}, {
  tableName:  'JoinRequests',
  timestamps: true,
  createdAt:  'requestedAt',
  updatedAt:  false,
});

module.exports = JoinRequest;
