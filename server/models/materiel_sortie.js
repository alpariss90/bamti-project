module.exports = (sequelize, DataTypes) => {
  const MaterielSortie = sequelize.define('MaterielSortie', {
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
    date_sortie: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    beneficiaire: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'materiel_sorties',
    timestamps: true
  });

  return MaterielSortie;
};
