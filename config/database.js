'use strict';

const { Sequelize } = require('sequelize');

const db = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || './data.sqlite',
  logging:  false,   // set to console.log to debug SQL queries
});

module.exports = db;
