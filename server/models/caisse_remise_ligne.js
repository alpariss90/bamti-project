// Une journée dans une remise : ce que l'expéditeur détenait et ce qu'il remet
module.exports = (sequelize, DataTypes) => {
  const CaisseRemiseLigne = sequelize.define('CaisseRemiseLigne', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_remise: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_journee: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    montant_attendu: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    // Au plus montant_attendu
    montant_remis: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    // Obligatoire si montant_remis < montant_attendu, vide sinon
    commentaire_ecart: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'caisse_remise_lignes',
    timestamps: true
  });

  return CaisseRemiseLigne;
};
