module.exports = (sequelize, DataTypes) => {
  const Vente = sequelize.define('Vente', {
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
    },
    // Obligatoire pour une vente livrée, toujours vide pour une vente usine
    livreur: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'ventes',
    timestamps: true
  });

  return Vente;
};
