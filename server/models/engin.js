module.exports = (sequelize, DataTypes) => {
  const Engin = sequelize.define('Engin', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    libelle: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "libelle_engins"
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
    tableName: 'engins',
    timestamps: true
  });

  return Engin;
};
