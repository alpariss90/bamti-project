module.exports = (sequelize, DataTypes) => {
  const MaterielRebut = sequelize.define('MaterielRebut', {
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
    date_rebut: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    motif: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'materiel_rebuts',
    timestamps: true
  });

  return MaterielRebut;
};
