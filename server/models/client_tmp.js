module.exports = (sequelize, DataTypes) => {
  const ClientTmp = sequelize.define('ClientTmp', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Identifiant unique donné par le téléphone revendeur (anti-doublon) ; vide pour une saisie au guichet
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      unique: true
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
      allowNull: true
    },
    adresse: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_sync: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    tableName: 'clients_tmp',
    timestamps: true
  });

  return ClientTmp;
};
