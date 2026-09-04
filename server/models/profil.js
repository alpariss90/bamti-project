module.exports = (sequelize, DataTypes) => {
  const Profil = sequelize.define('Profil', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    libelle: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "libelle_profils"
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
    tableName: 'profils',
    timestamps: true
  });

  return Profil;
};
