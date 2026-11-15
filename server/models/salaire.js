// models/salaire.js
module.exports = (sequelize, DataTypes) => {
  const Salaire = sequelize.define('Salaire', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_personnel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "une_personne_mois_date"
    },
    mois: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
      unique: "une_personne_mois_date"
    },
    annee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "une_personne_mois_date"
    },
    // Salaire réellement dû = salaire_base − montant_retenue − montant_jours_non_payes
    montant_salaire: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false
    },
    // Détail du calcul (vide pour les paies générées avant leur ajout)
    salaire_base: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: true
    },
    montant_retenue: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false,
      defaultValue: 0
    },
    montant_jours_non_payes: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false,
      defaultValue: 0
    },
    montant_credit: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false,
      defaultValue: 0
    },
    montant_gratification: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'salaires',
    timestamps: true
  });

 

  return Salaire;
};
