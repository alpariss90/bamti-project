// Remise d'argent d'une personne à une autre : l'argent ne change de main qu'une fois la remise reçue
module.exports = (sequelize, DataTypes) => {
  const CaisseRemise = sequelize.define('CaisseRemise', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_expediteur: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_destinataire: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'recue', 'refusee', 'annulee'),
      allowNull: false,
      defaultValue: 'en_attente'
    },
    commentaire_refus: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Reçue, refusée ou annulée le
    date_reponse: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'caisse_remises',
    timestamps: true
  });

  return CaisseRemise;
};
