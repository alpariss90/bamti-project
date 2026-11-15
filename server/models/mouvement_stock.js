// Mouvement physique de sachets (hors production) : enlèvement, retour, perte, ajustement d'inventaire
module.exports = (sequelize, DataTypes) => {
  const MouvementStock = sequelize.define('MouvementStock', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Identifiant unique, créé par le téléphone hors ligne : un même mouvement n'est jamais compté deux fois
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('enlevement', 'retour', 'perte', 'ajustement'),
      allowNull: false
    },
    // Effet sur le stock : négatif = sortie, positif = entrée
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_bon: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_tournee: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_inventaire: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Qui a fait le mouvement
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM('web', 'mobile'),
      allowNull: false,
      defaultValue: 'web'
    },
    // Moment réel de l'opération (heure du scan) ; createdAt = arrivée au serveur
    date_operation: {
      type: DataTypes.DATE,
      allowNull: false
    },
    // Accepté mais à vérifier (ex. bon dépassé lors d'une synchronisation hors ligne)
    anomalie: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    motif: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'mouvements_stock',
    timestamps: true
  });

  return MouvementStock;
};
