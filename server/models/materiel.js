module.exports = (sequelize, DataTypes) => {
  const Materiel = sequelize.define('Materiel', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    libelle: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "libelle_materiels"
    },
    stock_critique: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    deletedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'materiels',
    timestamps: true
  });

  return Materiel;
};
