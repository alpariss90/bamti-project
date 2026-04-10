module.exports = (sequelize, DataTypes) => {
  const TypeDepense = sequelize.define('TypeDepense', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    libelle: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "type_depense"
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
    tableName: 'type_depenses',
    timestamps: true
  });

  return TypeDepense;
};
