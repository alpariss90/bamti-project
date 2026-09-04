module.exports = (sequelize, DataTypes) => {
  const StockSachetEntree = sequelize.define('StockSachetEntree', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_production: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    observation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'stock_sachet_entrees',
    timestamps: true
  });

  return StockSachetEntree;
};
