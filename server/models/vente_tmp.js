module.exports = (sequelize, DataTypes) => {
  const VenteTmp = sequelize.define('VenteTmp', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Identifiant unique donné par le téléphone revendeur (anti-doublon) ; vide pour une saisie au guichet
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      unique: true
    },
    type_vente: {
      type: DataTypes.ENUM('livrer', 'usine'),
      allowNull: false
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    observation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type_paiement: {
      type: DataTypes.ENUM('total', 'echellonner'),
      allowNull: false
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    prix_unitaire: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    date_vente: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    id_client: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_sync: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Vente officielle créée à la validation (sert à intégrer un versement arrivé après la validation)
    id_vente_officielle: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'ventes_tmp',
    timestamps: true
  });

  return VenteTmp;
};
