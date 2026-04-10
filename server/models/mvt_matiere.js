module.exports = (sequelize, DataTypes) => {
  const MvtMatiere = sequelize.define('MvtMatiere', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    type_matiere: {
      type: DataTypes.ENUM('EMBALLAGE', 'SACHET PURE WATER'),
      allowNull: false
    },
    prix: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    quantite: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    date_mvt: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    montant_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    observation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type_mvt: {
      type: DataTypes.ENUM('rebus', 'achat', 'utilisation'),
      allowNull: false
    },
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'mvt_matieres',
    timestamps: true,
    hooks: {
      beforeCreate: (mvt) => {
        if (mvt.type_mvt === 'achat') {
          mvt.montant_total = (parseFloat(mvt.prix) || 0) * (parseFloat(mvt.quantite) || 0);
        } else {
          mvt.montant_total = 0;
          mvt.prix = 0;
          mvt.quantite = -Math.abs(mvt.quantite);
        }
      },
      beforeUpdate: (mvt) => {
        if (mvt.type_mvt === 'achat') {
          mvt.montant_total = (parseFloat(mvt.prix) || 0) * (parseFloat(mvt.quantite) || 0);
        } else {
          mvt.montant_total = 0;
          mvt.prix = 0;
          mvt.quantite = -Math.abs(mvt.quantite);
        }
      }
    }
  });

  return MvtMatiere;
};
