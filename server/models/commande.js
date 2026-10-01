module.exports = (sequelize, DataTypes) => {
  const Commande = sequelize.define('Commande', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
   
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    prix_unitaire: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 350
    },
    statut: {
      type: DataTypes.ENUM('en attente', 'livrée', 'annulée'),
      allowNull: false,
      defaultValue: 'en attente'
    },
     date_commande: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    id_client: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Téléphone au moment de la commande : saisi pour le client Anonyme,
    // copié depuis la fiche client pour les autres
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    // Saisis à la validation (livraison) de la commande
    livreur: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    observation_livraison: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'commandes',
    timestamps: true
  });

  return Commande;
};
