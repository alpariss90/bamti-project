// Journal des rapports automatiques : un rapport par (type, date_debut).
// Sert à éviter les doublons et à rattraper les envois manqués ou échoués.
module.exports = (sequelize, DataTypes) => {
  const RapportEnvoye = sequelize.define('RapportEnvoye', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('journalier', 'hebdomadaire', 'mensuel'),
      allowNull: false
    },
    date_debut: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    date_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'envoye', 'echec'),
      allowNull: false,
      defaultValue: 'en_cours'
    },
    tentatives: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    destinataires: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    message_erreur: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    envoye_le: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'rapports_envoyes',
    timestamps: true
  });

  return RapportEnvoye;
};
