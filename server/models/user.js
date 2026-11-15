module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "user_telephone"
    },
    login: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profil: {
      type: DataTypes.ENUM('admin', 'visualisation', 'caissier', 'magasinier', 'revendeur', 'gestionnaire'),
      allowNull: false,
      defaultValue: 'admin'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Dernière requête reçue de l'utilisateur (sert à savoir qui est connecté)
    derniere_activite: {
      type: DataTypes.DATE,
      allowNull: true
    },
    derniere_source: {
      type: DataTypes.ENUM('web', 'mobile'),
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
