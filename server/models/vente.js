module.exports = (sequelize, DataTypes) => {
  const Vente = sequelize.define('Vente', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    type_vente: {
      type: DataTypes.ENUM('livrer', 'usine'),
      allowNull: false
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    observation:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    type_paiement: {
      type: DataTypes.ENUM('total', 'echellonner'),
      allowNull: false
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
      
    },
    prix_unitaire: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    date_vente: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    id_client: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'ventes',
    timestamps: true
  });

  return Vente;
};
