module.exports = (sequelize, DataTypes) => {
  const Planification = sequelize.define('Planification', {
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
    }
  }, {
    tableName: 'planifications',
    timestamps: true
  });

  return Planification;
};
