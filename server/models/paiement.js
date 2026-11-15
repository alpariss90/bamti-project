module.exports = (sequelize, DataTypes) => {
  const Paiement = sequelize.define('Paiement', {
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
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    id_vente: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Utilisateur qui a encaissé (vide pour les anciens versements dont on ne sait pas qui les a saisis)
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    observation:{
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'paiements',
    timestamps: true
  });

  return Paiement;
};
