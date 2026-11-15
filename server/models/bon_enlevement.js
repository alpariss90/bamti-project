// Bon d'enlèvement : ce qu'un bénéficiaire a le droit de retirer à l'usine (règles dans services/stockEau.js)
module.exports = (sequelize, DataTypes) => {
  const BonEnlevement = sequelize.define('BonEnlevement', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // 10 chiffres tirés au hasard : contenu du QR code, imprimé aussi en clair
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    origine_type: {
      type: DataTypes.ENUM('vente', 'commande', 'reservation', 'ticket', 'carte_famille', 'carte_prepaye'),
      allowNull: false
    },
    // Référence libre vers la table d'origine (pas de contrainte FK)
    origine_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_client: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_carte: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Nom affiché au scan (client, réservation, membre de la famille)
    beneficiaire: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    quantite_due: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Diminue en cas de retour de sachets
    quantite_enlevee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    statut: {
      type: DataTypes.ENUM('ouvert', 'partiel', 'solde', 'annule'),
      allowNull: false,
      defaultValue: 'ouvert'
    },
    date_bon: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Qui a créé le bon
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'bons_enlevement',
    timestamps: true
  });

  return BonEnlevement;
};
