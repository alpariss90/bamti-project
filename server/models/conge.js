module.exports = (sequelize, DataTypes) => {
  const Conge = sequelize.define('Conge', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_personnel: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_depart: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    nombre_jours: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_retour: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    motif: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'conges',
    timestamps: true
  });

  return Conge;
};
