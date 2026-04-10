module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
   
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_client: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nom_chauffeur: {
      type: DataTypes.STRING,
      allowNull: false
    },
    marque_voiture: {
      type: DataTypes.STRING,
      allowNull: false
    },
    statut: {
      type: DataTypes.STRING,
      allowNull: false
    },
     date_livraison: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'tickets',
    timestamps: true
  });

  return Ticket;
};
