'use strict';

const { DataTypes } = require('sequelize');
const db = require('../config/database');

const User = db.define('User', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type:      DataTypes.STRING(150),
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
  },
  password: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type:         DataTypes.ENUM('Admin', 'Organizer', 'Participant'),
    defaultValue: 'Participant',
    allowNull:    false,
  },
  major: {
    type:         DataTypes.STRING(150),
    defaultValue: '',
  },
  bio: {
    type:         DataTypes.TEXT,
    defaultValue: '',
  },
  status: {
    type:         DataTypes.ENUM('active', 'banned'),
    defaultValue: 'active',
    allowNull:    false,
  },
}, {
  tableName:  'Users',
  timestamps: true,
});

module.exports = User;
