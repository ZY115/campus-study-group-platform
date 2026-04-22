'use strict';

const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Comment = db.define('Comment', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  // groupId and userId added via associations
  text: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName:  'Comments',
  timestamps: true,
  updatedAt:  false,
});

module.exports = Comment;
