module.exports = (sequelize, DataTypes) => {
  const ServicePerson = sequelize.define('ServicePerson', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    date_service: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('prise', 'arret'),
      allowNull: false
    },
    id_personnel: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    motif: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'service_person',
    timestamps: true
  });

  return ServicePerson;
};
