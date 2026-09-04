module.exports = (sequelize, DataTypes) => {
  const StockSachetSortie = sequelize.define('StockSachetSortie', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_sortie: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    motif: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Référence souple vers la vente d'origine (pas de contrainte FK : la vente
    // peut être physiquement supprimée lors d'une annulation).
    id_vente: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'stock_sachet_sorties',
    timestamps: true
  });

  return StockSachetSortie;
};
