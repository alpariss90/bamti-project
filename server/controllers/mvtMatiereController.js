const db = require('../models');
const { Op, Sequelize } = require('sequelize');
const MvtMatiere = db.MvtMatiere;

//  Fonction utilitaire pour message
function redirectWithMessage(req, res, msg, type = 'success', path = '/mvt_matieres/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}


// Affichage des depenses non valides
exports.matiereNonValide = async (req, res) => {
  try {
    const mvtMatieres = await MvtMatiere.findAll({
      where: {
        isvalid: {
          [Op.ne]: true, // Op.ne = "not equal" (différent de)
        },
      }
    });

    res.render("mvt_matieres/non_valide", {
      mvtMatieres,
      message: req.flash("message")[0] || null,
      pageTitle: "Gestion des Mouvements de Matière non validées",
    });
  } catch (err) {
    console.error("Erreur lors du chargement des Mouvements de Matière :", err);
    req.flash("message", {
      text: "Erreur serveur lors du chargement des Mouvements de Matière.",
      type: "danger",
    });
    return redirectWithMessage(req, res, 'Erreur lors de la création ou modification du mouvement.', 'danger');
  }
};

//  Liste des mouvements
exports.list = async (req, res) => {
  try {
    const mvtMatieres = await MvtMatiere.findAll({
      order: [['date_mvt', 'DESC']]
    });


 const result = await MvtMatiere.findAll({
    attributes: [
        'type_matiere',
        [Sequelize.fn('SUM', Sequelize.col('quantite')), 'total_quantite']
    ],
    where: {
        isValid: true   // si tu veux filtrer
    },
    group: ['type_matiere']
});



//console.log("---------------------------------");
//console.log(result[0].dataValues.total_quantite);



    res.render('mvt_matieres/index', {
      mvtMatieres,
      rs: result,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Mouvements de Matière'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des mouvements de matière :', err);
    redirectWithMessage(req, res, 'Erreur serveur lors du chargement des mouvements.', 'danger');
  }
}; 

//  Créer ou mettre à jour un mouvement
exports.createOrUpdate = async (req, res) => {
  const { id, type_matiere, prix, quantite, date_mvt, observation, type_mvt } = req.body;
  const createdBy = req.session?.user?.nom;

  if (!type_matiere || !type_mvt || !date_mvt || quantite === undefined) {
    return redirectWithMessage(req, res, 'Veuillez remplir les champs obligatoires.', 'danger');
  }

  try {
    let prixFinal = parseFloat(prix) || 0;
    let quantiteFinale = parseFloat(quantite) || 0;

    if (type_mvt === 'achat') {
      if (prixFinal < 0 || quantiteFinale < 0) {
        return redirectWithMessage(req, res, 'Le prix et la quantité doivent être positifs pour un achat.', 'danger');
      }
    } else {
      prixFinal = 0;
      quantiteFinale = -Math.abs(quantiteFinale);
    }

    if (id) {
      const mvt = await MvtMatiere.findByPk(id);
      if (!mvt) return redirectWithMessage(req, res, 'Mouvement introuvable.', 'danger');
      if (mvt.isValid) return redirectWithMessage(req, res, 'Ce mouvement est validé, modification impossible.', 'warning');

      await mvt.update({
        type_matiere,
        prix: prixFinal,
        quantite: quantiteFinale,
        date_mvt,
        observation,
        type_mvt,
        updatedBy: createdBy
      });

      return redirectWithMessage(req, res, 'Mouvement de matière mis à jour avec succès.', 'warning');
    } else {
      await MvtMatiere.create({
        type_matiere,
        prix: prixFinal,
        quantite: quantiteFinale,
        date_mvt,
        observation,
        type_mvt,
        createdBy,
        isValid: false
      });

      return redirectWithMessage(req, res, 'Mouvement de matière ajouté avec succès.', 'success');
    }
  } catch (err) {
    console.error('Erreur lors de la création/mise à jour :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la création ou modification du mouvement.', 'danger');
  }
};

//  Validation d’un mouvement
exports.validate = async (req, res) => {
  const { id } = req.params;

  try {
    const mvt = await MvtMatiere.findByPk(id);
    if (!mvt) return redirectWithMessage(req, res, 'Mouvement introuvable.', 'danger');

    await mvt.update({ isValid: true });

    return redirectWithMessage(req, res, 'Mouvement validé avec succès. Modification et suppression désactivées.', 'success');
  } catch (err) {
    console.error('Erreur lors de la validation :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la validation du mouvement.', 'danger');
  }
};

//  Suppression physique
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const mvt = await MvtMatiere.findByPk(id);
    if (!mvt) return redirectWithMessage(req, res, 'Mouvement introuvable.', 'danger');

    if (mvt.isValid) {
      return redirectWithMessage(req, res, 'Mouvement validé, suppression impossible.', 'warning');
    }

    await mvt.destroy();
    return redirectWithMessage(req, res, 'Mouvement supprimé avec succès.', 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression du mouvement.', 'danger');
  }
};

    function convertToISO(dateFR) {
  const [jour, mois, annee] = dateFR.split('/');
  return `${annee}-${mois}-${jour}`; // Format MySQL
}



// === FILTRAGE DES MOUVEMENTS DE MATIÈRES ===
exports.mvtMatieresFiltrees = async (req, res) => {
  try {
   
        date_debut=req.query.date_debut || new Date().toLocaleDateString('fr-FR'); 

   date_fin=req.query.date_fin || new Date().toLocaleDateString('fr-FR');

   type_matiere=req.query.type_matiere || 'tous';

   type_mvt=req.query.type_mvt || 'tous';


    // Construction dynamique du filtre
    const whereClause = {
      date_mvt: {
        [Op.between]: [new Date(convertToISO(date_debut)), new Date(convertToISO(date_fin))]
      },
    };

    
     
   

    // Type matière
    if (type_matiere && type_matiere !== 'tous') {
      whereClause.type_matiere = type_matiere;
    }

    // Type mouvement
    if (type_mvt && type_mvt !== 'tous') {
      whereClause.type_mvt = type_mvt;
    }

    whereClause.isValid=1;

    // Récupération des mouvements
    const mouvements = await MvtMatiere.findAll({
      where: whereClause,
      order: [['date_mvt', 'DESC']],
    });




const resultats = mouvements.reduce((acc, mvt) => {
  const typeMatiere = mvt.type_matiere;
  const typeMvt = mvt.type_mvt;
  const prix = Number(mvt.prix) || 0;
  const quantite = Number(mvt.quantite) || 0;

  if (!acc[typeMatiere]) acc[typeMatiere] = {};
  if (!acc[typeMatiere][typeMvt]) {
    acc[typeMatiere][typeMvt] = { totalPrix: 0, totalQuantite: 0 };
  }

  acc[typeMatiere][typeMvt].totalPrix += prix;
  acc[typeMatiere][typeMvt].totalQuantite += quantite;
  return acc;
}, {});

// Extraction des 6 variables (avec valeurs par défaut si la combinaison n'existe pas)
const sachetAchat = resultats['SACHET PURE WATER']?.['achat'] ?? { totalPrix: 0, totalQuantite: 0 };
const sachetUtilisation = resultats['SACHET PURE WATER']?.['utilisation'] ?? { totalPrix: 0, totalQuantite: 0 };
const sachetRebus = resultats['SACHET PURE WATER']?.['rebus'] ?? { totalPrix: 0, totalQuantite: 0 };

const emballageAchat = resultats['EMBALLAGE']?.['achat'] ?? { totalPrix: 0, totalQuantite: 0 };
const emballageUtilisation = resultats['EMBALLAGE']?.['utilisation'] ?? { totalPrix: 0, totalQuantite: 0 };
const emballageRebus = resultats['EMBALLAGE']?.['rebus'] ?? { totalPrix: 0, totalQuantite: 0 };


// Arrondir toutes les quantités et prix
[sachetAchat, sachetUtilisation, sachetRebus, emballageAchat, emballageUtilisation, emballageRebus].forEach(obj => {
  obj.totalQuantite = Math.round(obj.totalQuantite * 100) / 100;
  obj.totalPrix = Math.round(obj.totalPrix * 100) / 100;
});


// Exemple d'utilisation
//console.log('Sachet pure water - Achats :', sachetAchat);
//console.log('Sachet pure water - Utilisation :', sachetUtilisation);
//console.log('Sachet pure water - Rebus :', sachetRebus);
//console.log('Emballage - Achats :', emballageAchat);
//console.log('Emballage - Utilisation :', emballageUtilisation);
//console.log('Emballage - Rebus :', emballageRebus);



    // Regroupement par type de matière et type de mouvement
    /*const regroupement = {};
    mouvements.forEach((mvt) => {
      const key = `${mvt.type_matiere}-${mvt.type_mvt}`;
      if (!regroupement[key]) {
        regroupement[key] = {
          type_matiere: mvt.type_matiere,
          type_mvt: mvt.type_mvt,
          quantiteTotale: 0,
          montantTotal: 0,
          mouvements: [],
        };
      }

      regroupement[key].quantiteTotale += parseFloat(mvt.quantite);
      regroupement[key].montantTotal += parseFloat(mvt.montant_total);
      regroupement[key].mouvements.push(mvt);
    });

    const mouvementsAgg = Object.values(regroupement);*/

    // Totaux globaux
    const totalQuantite = 0//mouvementsAgg.reduce((s, m) => s + m.quantiteTotale, 0);
    const totalMontant = 0//mouvementsAgg.reduce((s, m) => s + m.montantTotal, 0);

    // Options possibles pour les filtres (provenant des ENUM)
    const matieresEnum = ['SACHET PURE WATER', 'EMBALLAGE'];
    const typesMvtEnum = ['achat', 'utilisation', 'rebus'];

    // Rendu de la page
    res.render('mvt_matieres/filtre', {
      mvtMatieres: mouvements,
      matieres: matieresEnum,
      typesMvt: typesMvtEnum,
      totalQuantite,
      totalMontant,
      type_matiere: type_matiere || 'tous',
      type_mvt: type_mvt || 'tous',
      date_debut: date_debut || '',
      date_fin: date_fin || '',
      pageTitle: `Mouvements filtrés du ${date_debut || '...'} au ${date_fin || '...'}`,
      message: req.flash('message')[0] || null,
      sachetAchat, sachetUtilisation, sachetRebus, emballageAchat, emballageUtilisation, emballageRebus,
    });
  } catch (err) {
    console.error('Erreur lors du filtrage des mouvements :', err);
    redirectWithMessage(req, res, 'Erreur lors du filtrage des mouvements de matière.', 'danger');
  }
};