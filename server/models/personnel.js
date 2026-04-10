module.exports = (sequelize, DataTypes) => {
  const Personnel = sequelize.define('Personnel', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "personnel_telephone"
    },
     salaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null
    },
    etat: {
      type: DataTypes.BOOLEAN, // true = actif, false = inactif
      allowNull: false,
      defaultValue: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    deletedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'personnels',
    timestamps: true
  });

  return Personnel;
};
