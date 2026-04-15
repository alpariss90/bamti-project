// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bamti_gestion', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // pour désactiver les logs SQL
  define: {
    timestamps: false // désactive createdAt / updatedAt par défaut
  }
});

module.exports = sequelize;
