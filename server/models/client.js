module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: 'client_telphone'
    },
    adresse: {
      type: DataTypes.STRING,
      allowNull: true
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
    tableName: 'clients',
    timestamps: true
  });

  return Client;
};
