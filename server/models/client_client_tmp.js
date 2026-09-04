module.exports = (sequelize, DataTypes) => {
  const ClientClientTmp = sequelize.define('ClientClientTmp', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_client_tmp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID dans clients_tmp (> 10000, client créé depuis mobile)'
    },
    id_client: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID réel dans clients après insertion'
    }
  }, {
    tableName: 'client_client_tmp',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['id_client_tmp'] }
    ]
  });

  return ClientClientTmp;
};
