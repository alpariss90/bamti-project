module.exports = (sequelize, DataTypes) => {
  const PaiementTmp = sequelize.define('PaiementTmp', {
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
    observation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_sync: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'paiements_tmp',
    timestamps: true
  });

  return PaiementTmp;
};
