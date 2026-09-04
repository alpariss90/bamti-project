const { Op } = require('sequelize');
const db = require('../models');
const StockSachetEntree = db.StockSachetEntree;
const StockSachetSortie = db.StockSachetSortie;

// =======================
// Fonction utilitaire commune
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/stock-sachet/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Stock actuel = Σ entrées (production) − Σ sorties (ventes + annulations)
async function calculerStock() {
  const [totalEntrees, totalSorties] = await Promise.all([
    StockSachetEntree.sum('quantite'),
    StockSachetSortie.sum('quantite')
  ]);
  return (totalEntrees || 0) - (totalSorties || 0);
}

// =======================
// Enregistre une sortie de stock de sachets produits.
// Appelée automatiquement lors d'une vente ou d'une annulation de vente
// (ventes, commandes validées, tickets validés). Ne redirige rien, ne
// jette pas d'erreur bloquante pour l'appelant si possible.
// =======================
async function enregistrerSortieSachet({ quantite, date, motif, id_vente, createdBy }, transaction) {
  if (!quantite || quantite <= 0) return null;

  return StockSachetSortie.create(
    {
      quantite,
      date_sortie: date || new Date().toISOString().slice(0, 10),
      motif: motif || null,
      id_vente: id_vente || null,
      createdBy: createdBy || null
    },
    transaction ? { transaction } : undefined
  );
}

// =======================
// Enregistre une entrée de stock de sachets produits.
// Appelée automatiquement lors de l'annulation d'une vente (restitution du stock).
// =======================
async function enregistrerEntreeSachet({ quantite, date, observation, createdBy }, transaction) {
  if (!quantite || quantite <= 0) return null;

  return StockSachetEntree.create(
    {
      quantite,
      date_production: date || new Date().toISOString().slice(0, 10),
      observation: observation || null,
      createdBy: createdBy || null
    },
    transaction ? { transaction } : undefined
  );
}

// =======================
// Page Production (entrée de stock) : formulaire + historique
// =======================
exports.form = async (req, res) => {
  try {
    const entrees = await StockSachetEntree.findAll({
      order: [['date_production', 'DESC'], ['id', 'DESC']]
    });

    const stock = await calculerStock();

    res.render('stock_sachet/index', {
      entrees,
      stock,
      message: req.flash('message')[0] || null,
      pageTitle: 'Stock des sachets produits'
    });
  } catch (error) {
    console.error('Erreur lors du chargement du stock de sachets :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement.', 'danger');
  }
};

// =======================
// Enregistrer une production (entrée)
// =======================
exports.create = async (req, res) => {
  const { quantite, date_production, observation } = req.body;
  const createdBy = req.session?.user?.login || null;

  if (!quantite || !date_production) {
    return redirectWithMessage(req, res, 'La quantité et la date de production sont obligatoires.', 'danger');
  }

  const qte = parseInt(quantite, 10);
  if (!qte || qte <= 0) {
    return redirectWithMessage(req, res, 'La quantité doit être un nombre positif.', 'danger');
  }

  try {
    await StockSachetEntree.create({
      quantite: qte,
      date_production,
      observation: observation || null,
      createdBy
    });

    return redirectWithMessage(req, res, 'Production enregistrée avec succès.', 'success');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la production :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l\'enregistrement de la production.', 'danger');
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

    const whereEntree = {};
    const whereSortie = {};
    if (periode) {
      whereEntree.date_production = { [Op.between]: periode };
      whereSortie.date_sortie = { [Op.between]: periode };
    }

    const [totalEntrees, totalSorties, stockActuel] = await Promise.all([
      StockSachetEntree.sum('quantite', { where: whereEntree }),
      StockSachetSortie.sum('quantite', { where: whereSortie }),
      calculerStock()
    ]);

    res.render('stock_sachet/statistiques', {
      entrees: totalEntrees || 0,
      sorties: totalSorties || 0,
      stock: stockActuel,
      date,
      dateDebut,
      dateFin,
      message: req.flash('message')[0] || null,
      pageTitle: 'Statistiques stock sachets'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques stock sachets :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des statistiques.', 'danger', '/stock-sachet/statistiques');
  }
};

exports.calculerStock = calculerStock;
exports.enregistrerSortieSachet = enregistrerSortieSachet;
exports.enregistrerEntreeSachet = enregistrerEntreeSachet;
