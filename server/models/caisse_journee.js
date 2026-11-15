// Journée de caisse clôturée : ce qu'une personne a encaissé un jour donné, et chez qui est cet argent
module.exports = (sequelize, DataTypes) => {
  const CaisseJournee = sequelize.define('CaisseJournee', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Qui a encaissé
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Total des paiements encaissés ce jour, figé au moment de la clôture
    montant_encaisse: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    // Chez qui est l'argent actuellement, et combien
    id_detenteur: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    montant_detenu: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
  }, {
    tableName: 'caisse_journees',
    timestamps: true
  });

  return CaisseJournee;
};
