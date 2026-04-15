module.exports = (sequelize, DataTypes) => {
  const PaiementTmp = sequelize.define('PaiementTmp', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
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
    }
  }, {
    tableName: 'paiements_tmp',
    timestamps: true
  });

  return PaiementTmp;
};
