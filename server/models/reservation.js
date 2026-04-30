module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define('Reservation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom_prenom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    adresse: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    prix_unitaire: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 350,
    },
    qte: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_livre: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    date_livraison: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    nom_livreur: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    observation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    id_vente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'reservations',
    timestamps: true,
  });

  return Reservation;
};
