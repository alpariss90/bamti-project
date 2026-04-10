// models/depense.js
module.exports = (sequelize, DataTypes) => {
  const Depense = sequelize.define('Depense', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_type_depense: {
      type: DataTypes.INTEGER,
      allowNull: false,

    },
    id_engin: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    date_depense: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    montant_depense: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    observation: {
      type: DataTypes.STRING,
      allowNull: false

    },
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false
    },
    
     updatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'depenses',
    timestamps: true 
  });

  return Depense;
};
