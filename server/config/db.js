// config/database.js
const { Sequelize } = require('sequelize');

// Tests automatiques (npm test, NODE_ENV=test) : base séparée bamti_test, jamais les vraies données
const NOM_BASE = process.env.NODE_ENV === 'test' ? 'bamti_test' : 'bamti_gestion';

const sequelize = new Sequelize(NOM_BASE, 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  timezone: '+01:00',
  define: {
    timestamps: false
  }
});

module.exports = sequelize;
