'use strict';

const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Group = db.define('Group', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  course: {
    type:      DataTypes.STRING(20),
    allowNull: false,
  },
  description: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  visibility: {
    type:         DataTypes.ENUM('public', 'private'),
    defaultValue: 'public',
    allowNull:    false,
  },
  format: {
    type:         DataTypes.ENUM('in-person', 'virtual'),
    defaultValue: 'in-person',
    allowNull:    false,
  },
  location: {
    type:         DataTypes.STRING(200),
    defaultValue: '',
  },
  meetingLink: {
    type:         DataTypes.STRING(500),
    defaultValue: '',
  },
  schedule: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  maxSize: {
    type:         DataTypes.INTEGER,
    defaultValue: 10,
  },
  // Tags stored as JSON string; getter/setter handles parse/stringify
  tags: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('tags');
      try { return raw ? JSON.parse(raw) : []; }
      catch { return []; }
    },
    set(val) {
      this.setDataValue('tags', JSON.stringify(Array.isArray(val) ? val : []));
    },
  },
  status: {
    type:         DataTypes.ENUM('active', 'removed'),
    defaultValue: 'active',
    allowNull:    false,
  },
  reports: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  // organizerId is added via association (belongsTo User)
}, {
  tableName:  'Groups',
  timestamps: true,
});

module.exports = Group;
