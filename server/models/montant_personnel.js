module.exports = (sequelize, DataTypes) => {
  const MontantPersonnel = sequelize.define('MontantPersonnel', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_personnel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "salaire_personnel" // 1 salaire par personnel
    },
    salaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    tableName: 'montant_personnel',
    timestamps: true
  });

  return MontantPersonnel;
};
