module.exports = (sequelize, DataTypes) => {
  const Revendeur = sequelize.define('Revendeur', {
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
      unique: 'revendeur_telephone'
    },
    adresse: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gain_par_sachet: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    tableName: 'revendeurs',
    timestamps: true
  });

  return Revendeur;
};
