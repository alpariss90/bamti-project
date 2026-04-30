// models/personnel_avance.js
module.exports = (sequelize, DataTypes) => {
  const PersonnelAvance = sequelize.define('PersonnelAvance', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_personnel: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    jour: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      }
    },
    mois: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      }
    },
    annee: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    observation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    montant: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('credit','gratification'),
      allowNull: false
    }
  }, {
    tableName: 'personnel_avances',
    timestamps: true
  });

  PersonnelAvance.associate = models => {
    PersonnelAvance.belongsTo(models.Personnel, { foreignKey: 'id_personnel', as: 'personnel' });
  };

  return PersonnelAvance;
};
