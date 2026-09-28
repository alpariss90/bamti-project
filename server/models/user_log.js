// Historique des connexions / déconnexions des utilisateurs
module.exports = (sequelize, DataTypes) => {
  const UserLog = sequelize.define('UserLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('connexion', 'deconnexion'),
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM('web', 'mobile'),
      allowNull: false,
      defaultValue: 'web'
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    date_action: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_logs',
    timestamps: false
  });

  return UserLog;
};
