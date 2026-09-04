module.exports = (sequelize, DataTypes) => {
  const MaterielEntree = sequelize.define('MaterielEntree', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_materiel: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_entree: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'materiel_entrees',
    timestamps: true
  });

  return MaterielEntree;
};
