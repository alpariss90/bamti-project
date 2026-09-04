const { Op } = require('sequelize');
const db = require('../models');
const sequelize = db.sequelize;
const Materiel = db.Materiel;
const MaterielEntree = db.MaterielEntree;
const MaterielSortie = db.MaterielSortie;
const MaterielRebut = db.MaterielRebut;

// =======================
// Fonction utilitaire commune
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/materiel/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Stock actuel d'un matériel = Σ entrées − Σ sorties − Σ rebuts
async function calculerStock(id_materiel, options = {}) {
  const queryOptions = { where: { id_materiel } };
  if (options.transaction) queryOptions.transaction = options.transaction;

  const [totalEntrees, totalSorties, totalRebuts] = await Promise.all([
    MaterielEntree.sum('quantite', queryOptions),
    MaterielSortie.sum('quantite', queryOptions),
    MaterielRebut.sum('quantite', queryOptions)
  ]);

  return (totalEntrees || 0) - (totalSorties || 0) - (totalRebuts || 0);
}

// Matériels dont le stock actuel est descendu au seuil critique ou en dessous
async function getAlertesStockCritique() {
  const materiels = await Materiel.findAll({
    where: { deletedAt: null, deletedBy: null, stock_critique: { [Op.ne]: null } }
  });

  const alertes = [];
  for (const materiel of materiels) {
    const stock = await calculerStock(materiel.id);
    if (stock <= materiel.stock_critique) {
      alertes.push({ libelle: materiel.libelle, stock, stock_critique: materiel.stock_critique });
    }
  }
  return alertes;
}

// Normalise les lignes matériel/quantité envoyées par un formulaire multi-lignes
function extraireLignes(id_materiel, quantite) {
  const idsMateriel = Array.isArray(id_materiel) ? id_materiel : (id_materiel ? [id_materiel] : []);
  const quantites = Array.isArray(quantite) ? quantite : (quantite ? [quantite] : []);

  const lignes = [];
  for (let i = 0; i < idsMateriel.length; i++) {
    if (!idsMateriel[i]) continue;
    const q = parseInt(quantites[i], 10);
    if (!q || q <= 0) continue;
    lignes.push({ id_materiel: idsMateriel[i], quantite: q });
  }
  return lignes;
}

// =======================
// Catalogue matériel
// =======================
exports.list = async (req, res) => {
  try {
    const materiels = await Materiel.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    const materielsAvecStock = await Promise.all(materiels.map(async m => ({
      ...m.toJSON(),
      stock: await calculerStock(m.id)
    })));

    res.render('materiel/index', {
      materiels: materielsAvecStock,
      materielEdit: null,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion du matériel'
    });
  } catch (error) {
    console.error('Erreur lors du chargement du matériel :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement du matériel.', 'danger');
  }
};

// =======================
// Créer ou mettre à jour un matériel
// =======================
exports.createOrUpdate = async (req, res) => {
  const { id, libelle, stock_critique } = req.body;

  if (!libelle) {
    return redirectWithMessage(req, res, 'Le libellé est obligatoire.', 'danger');
  }

  let seuil = null;
  if (stock_critique !== '' && stock_critique !== undefined && stock_critique !== null) {
    seuil = parseInt(stock_critique, 10);
    if (isNaN(seuil) || seuil < 0) {
      return redirectWithMessage(req, res, 'Le stock critique doit être un nombre positif.', 'danger');
    }
  }

  try {
    if (id) {
      const materiel = await Materiel.findByPk(id);
      if (!materiel) {
        return redirectWithMessage(req, res, 'Matériel introuvable.', 'danger');
      }

      await materiel.update({ libelle, stock_critique: seuil });
      return redirectWithMessage(req, res, 'Matériel modifié avec succès.', 'warning');
    } else {
      await Materiel.create({ libelle, stock_critique: seuil });
      return redirectWithMessage(req, res, 'Matériel ajouté avec succès.', 'success');
    }
  } catch (error) {
    console.error('Erreur création/mise à jour matériel :', error);

    const msg = error.name === 'SequelizeUniqueConstraintError'
      ? 'Ce libellé existe déjà.'
      : 'Erreur lors de la création ou mise à jour.';
    return redirectWithMessage(req, res, msg, 'danger');
  }
};

// =======================
// Édition d'un matériel (pré-remplissage)
// =======================
exports.edit = async (req, res) => {
  const id = req.params.id;

  try {
    const materielEdit = await Materiel.findByPk(id);
    if (!materielEdit) {
      return redirectWithMessage(req, res, 'Matériel introuvable.', 'danger');
    }

    const materiels = await Materiel.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    const materielsAvecStock = await Promise.all(materiels.map(async m => ({
      ...m.toJSON(),
      stock: await calculerStock(m.id)
    })));

    res.render('materiel/index', {
      materielEdit,
      materiels: materielsAvecStock,
      message: req.flash('message')[0] || null,
      pageTitle: 'Modifier Matériel'
    });
  } catch (error) {
    console.error('Erreur lors du chargement du matériel :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement du matériel.', 'danger');
  }
};

// =======================
// Page Entrée de matériel
// =======================
exports.entreeForm = async (req, res) => {
  try {
    const materiels = await Materiel.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    const entrees = await MaterielEntree.findAll({
      include: [{ model: Materiel, as: 'materiel', attributes: ['id', 'libelle'] }],
      order: [['date_entree', 'DESC'], ['id', 'DESC']]
    });

    res.render('materiel/entree', {
      materiels,
      entrees,
      message: req.flash('message')[0] || null,
      pageTitle: 'Entrée de matériel'
    });
  } catch (error) {
    console.error('Erreur lors du chargement de l\'entrée de matériel :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement.', 'danger', '/materiel/entree');
  }
};

// =======================
// Enregistrer une entrée (une ou plusieurs lignes matériel/quantité, même date)
// =======================
exports.entreeCreate = async (req, res) => {
  const { date_entree, id_materiel, quantite } = req.body;
  const createdBy = req.session?.user?.login || null;

  if (!date_entree) {
    return redirectWithMessage(req, res, 'La date d\'entrée est obligatoire.', 'danger', '/materiel/entree');
  }

  const lignes = extraireLignes(id_materiel, quantite);
  if (lignes.length === 0) {
    return redirectWithMessage(req, res, 'Veuillez renseigner au moins une ligne matériel / quantité valide.', 'danger', '/materiel/entree');
  }

  try {
    for (const ligne of lignes) {
      await MaterielEntree.create({
        id_materiel: ligne.id_materiel,
        quantite: ligne.quantite,
        date_entree,
        createdBy
      });
    }

    return redirectWithMessage(req, res, `Entrée enregistrée (${lignes.length} ligne(s)).`, 'success', '/materiel/entree');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'entrée :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l\'enregistrement de l\'entrée.', 'danger', '/materiel/entree');
  }
};

// =======================
// Page Sortie de matériel
// =======================
exports.sortieForm = async (req, res) => {
  try {
    const materiels = await Materiel.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    const materielsAvecStock = await Promise.all(materiels.map(async m => ({
      id: m.id,
      libelle: m.libelle,
      stock: await calculerStock(m.id)
    })));

    const sorties = await MaterielSortie.findAll({
      include: [{ model: Materiel, as: 'materiel', attributes: ['id', 'libelle'] }],
      order: [['date_sortie', 'DESC'], ['id', 'DESC']]
    });

    res.render('materiel/sortie', {
      materiels: materielsAvecStock,
      sorties,
      message: req.flash('message')[0] || null,
      pageTitle: 'Sortie de matériel'
    });
  } catch (error) {
    console.error('Erreur lors du chargement de la sortie de matériel :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement.', 'danger', '/materiel/sortie');
  }
};

// =======================
// Enregistrer une sortie (une ou plusieurs lignes, même date, même bénéficiaire)
// Bloque si la quantité dépasse le stock disponible.
// =======================
exports.sortieCreate = async (req, res) => {
  const { date_sortie, beneficiaire, id_materiel, quantite } = req.body;
  const createdBy = req.session?.user?.login || null;

  if (!date_sortie || !beneficiaire) {
    return redirectWithMessage(req, res, 'La date et le bénéficiaire sont obligatoires.', 'danger', '/materiel/sortie');
  }

  const lignes = extraireLignes(id_materiel, quantite);
  if (lignes.length === 0) {
    return redirectWithMessage(req, res, 'Veuillez renseigner au moins une ligne matériel / quantité valide.', 'danger', '/materiel/sortie');
  }

  const t = await sequelize.transaction();
  try {
    for (const ligne of lignes) {
      const materiel = await Materiel.findByPk(ligne.id_materiel, { transaction: t });
      if (!materiel) {
        throw new Error('Matériel introuvable.');
      }

      const stockActuel = await calculerStock(ligne.id_materiel, { transaction: t });
      if (ligne.quantite > stockActuel) {
        throw new Error(`Stock insuffisant pour "${materiel.libelle}" (stock disponible : ${stockActuel}).`);
      }

      await MaterielSortie.create({
        id_materiel: ligne.id_materiel,
        quantite: ligne.quantite,
        date_sortie,
        beneficiaire,
        createdBy
      }, { transaction: t });
    }

    await t.commit();
    return redirectWithMessage(req, res, `Sortie enregistrée (${lignes.length} ligne(s)).`, 'success', '/materiel/sortie');
  } catch (error) {
    await t.rollback();
    console.error('Erreur lors de l\'enregistrement de la sortie :', error);
    return redirectWithMessage(req, res, error.message || 'Erreur lors de l\'enregistrement de la sortie.', 'danger', '/materiel/sortie');
  }
};

// =======================
// Page Rebut de matériel
// =======================
exports.rebutForm = async (req, res) => {
  try {
    const materiels = await Materiel.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    const materielsAvecStock = await Promise.all(materiels.map(async m => ({
      id: m.id,
      libelle: m.libelle,
      stock: await calculerStock(m.id)
    })));

    const rebuts = await MaterielRebut.findAll({
      include: [{ model: Materiel, as: 'materiel', attributes: ['id', 'libelle'] }],
      order: [['date_rebut', 'DESC'], ['id', 'DESC']]
    });

    res.render('materiel/rebut', {
      materiels: materielsAvecStock,
      rebuts,
      message: req.flash('message')[0] || null,
      pageTitle: 'Rebut de matériel'
    });
  } catch (error) {
    console.error('Erreur lors du chargement du rebut de matériel :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement.', 'danger', '/materiel/rebut');
  }
};

// =======================
// Enregistrer un rebut (une ou plusieurs lignes, même date, même motif)
// Bloque si la quantité dépasse le stock disponible.
// =======================
exports.rebutCreate = async (req, res) => {
  const { date_rebut, motif, id_materiel, quantite } = req.body;
  const createdBy = req.session?.user?.login || null;

  if (!date_rebut || !motif) {
    return redirectWithMessage(req, res, 'La date et le motif sont obligatoires.', 'danger', '/materiel/rebut');
  }

  const lignes = extraireLignes(id_materiel, quantite);
  if (lignes.length === 0) {
    return redirectWithMessage(req, res, 'Veuillez renseigner au moins une ligne matériel / quantité valide.', 'danger', '/materiel/rebut');
  }

  const t = await sequelize.transaction();
  try {
    for (const ligne of lignes) {
      const materiel = await Materiel.findByPk(ligne.id_materiel, { transaction: t });
      if (!materiel) {
        throw new Error('Matériel introuvable.');
      }

      const stockActuel = await calculerStock(ligne.id_materiel, { transaction: t });
      if (ligne.quantite > stockActuel) {
        throw new Error(`Stock insuffisant pour "${materiel.libelle}" (stock disponible : ${stockActuel}).`);
      }

      await MaterielRebut.create({
        id_materiel: ligne.id_materiel,
        quantite: ligne.quantite,
        date_rebut,
        motif,
        createdBy
      }, { transaction: t });
    }

    await t.commit();
    return redirectWithMessage(req, res, `Rebut enregistré (${lignes.length} ligne(s)).`, 'success', '/materiel/rebut');
  } catch (error) {
    await t.rollback();
    console.error('Erreur lors de l\'enregistrement du rebut :', error);
    return redirectWithMessage(req, res, error.message || 'Erreur lors de l\'enregistrement du rebut.', 'danger', '/materiel/rebut');
  }
};

// =======================
// Statistiques (par date ou par plage de dates)
// =======================
exports.statistiques = async (req, res) => {
  try {
    const date = (req.query.date || '').trim();
    const dateDebut = (req.query.date_debut || '').trim();
    const dateFin = (req.query.date_fin || '').trim();

    let periode = null;
    if (date) periode = [date, date];
    else if (dateDebut && dateFin) periode = [dateDebut, dateFin];

    const materiels = await Materiel.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    const stats = await Promise.all(materiels.map(async m => {
      const whereEntree = { id_materiel: m.id };
      const whereSortie = { id_materiel: m.id };
      const whereRebut = { id_materiel: m.id };

      if (periode) {
        whereEntree.date_entree = { [Op.between]: periode };
        whereSortie.date_sortie = { [Op.between]: periode };
        whereRebut.date_rebut = { [Op.between]: periode };
      }

      const [totalEntrees, totalSorties, totalRebuts, stockActuel] = await Promise.all([
        MaterielEntree.sum('quantite', { where: whereEntree }),
        MaterielSortie.sum('quantite', { where: whereSortie }),
        MaterielRebut.sum('quantite', { where: whereRebut }),
        calculerStock(m.id)
      ]);

      return {
        libelle: m.libelle,
        entrees: totalEntrees || 0,
        sorties: totalSorties || 0,
        rebuts: totalRebuts || 0,
        stock: stockActuel
      };
    }));

    res.render('materiel/statistiques', {
      stats,
      date,
      dateDebut,
      dateFin,
      message: req.flash('message')[0] || null,
      pageTitle: 'Statistiques matériel'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques matériel :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des statistiques.', 'danger', '/materiel/statistiques');
  }
};

exports.calculerStock = calculerStock;
exports.getAlertesStockCritique = getAlertesStockCritique;
