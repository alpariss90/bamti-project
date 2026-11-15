// Comptage physique du stock d'eau ; l'écart devient un mouvement « ajustement »
module.exports = (sequelize, DataTypes) => {
  const Inventaire = sequelize.define('Inventaire', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    date_inventaire: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Sachets comptés à la main
    stock_compte: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Stock physique selon le logiciel au moment du comptage
    stock_calcule: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Compté − calculé
    ecart: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    observation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'inventaires',
    timestamps: true
  });

  return Inventaire;
};
