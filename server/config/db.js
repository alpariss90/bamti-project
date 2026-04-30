// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bamti_gestion', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  timezone: '+01:00',
  define: {
    timestamps: false
  }
});

module.exports = sequelize;
