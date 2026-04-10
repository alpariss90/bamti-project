module.exports = (sequelize, DataTypes) => {
  const Paiement = sequelize.define('Paiement', {
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
