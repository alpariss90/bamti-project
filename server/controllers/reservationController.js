const db = require('../models');
const { Reservation, Vente, Paiement, sequelize } = db;
const { Op } = require('sequelize');

function today() {
  return new Date().toISOString().split('T')[0];
}

function redirectMsg(req, res, type, text, path = '/reservations/index') {
  req.flash('message', JSON.stringify({ type, text }));
  return res.redirect(path);
}

function renderVars(req, extra = {}) {
  return {
    message: (() => {
      const raw = req.flash('message')[0];
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return { type: 'info', text: raw }; }
    })(),
    error: null,
    warning: null,
    success: null,
    ...extra,
  };
}

// ── GET /reservations/index ────────────────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.render('reservations/index', renderVars(req, {
      reservations,
      pageTitle: 'Faire une réservation',
    }));
  } catch (err) {
    console.error('[Reservation] index :', err);
    res.render('reservations/index', renderVars(req, {
      reservations: [],
      pageTitle: 'Faire une réservation',
      error: err.message,
    }));
  }
};

// ── POST /reservations/create ──────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { nom_prenom, telephone, adresse, prix_unitaire, qte, date_livraison } = req.body;

  if (!nom_prenom || !qte || !prix_unitaire || !date_livraison) {
    return redirectMsg(req, res, 'danger', 'Tous les champs obligatoires doivent être remplis.');
  }

  const pu     = parseFloat(prix_unitaire);
  const qteInt = parseInt(qte, 10);
  const montant = pu * qteInt;
  const dateVente = today();
  const userId = req.session.user.id;

  const t = await sequelize.transaction();
  try {
    // 1. Créer la vente
    const vente = await Vente.create({
      type_vente: 'usine',
      quantite: qteInt,
      observation: 'reservation',
      type_paiement: 'total',
      montant,
      prix_unitaire: pu,
      date_vente: dateVente,
      id_client: 1,
      user: userId,
    }, { transaction: t });

    // 2. Créer le paiement
    await Paiement.create({
      montant,
      date: dateVente,
      id_vente: vente.id,
      observation: 'reservation',
    }, { transaction: t });

    // 3. Créer la réservation
    await Reservation.create({
      nom_prenom: nom_prenom.trim(),
      telephone:  telephone?.trim() || null,
      adresse:    adresse?.trim()   || null,
      prix_unitaire: pu,
      qte: qteInt,
      is_livre: false,
      date_livraison,
      nom_livreur: null,
      observation: null,
      id_vente: vente.id,
      user: userId,
    }, { transaction: t });

    await t.commit();
    return redirectMsg(req, res, 'success', `Réservation créée avec succès pour ${nom_prenom}.`);
  } catch (err) {
    await t.rollback();
    console.error('[Reservation] create :', err);
    return redirectMsg(req, res, 'danger', `Erreur lors de la création : ${err.message}`);
  }
};

// ── POST /reservations/livrer/:id ─────────────────────────────────────────────
exports.livrer = async (req, res) => {
  const { nom_livreur, observation } = req.body;
  if (!nom_livreur?.trim()) {
    return redirectMsg(req, res, 'danger', 'Le nom du livreur est obligatoire.');
  }
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return redirectMsg(req, res, 'danger', 'Réservation introuvable.');

    await reservation.update({
      is_livre: true,
      nom_livreur: nom_livreur.trim(),
      observation: observation?.trim() || reservation.observation,
    });
    return redirectMsg(req, res, 'success', `Réservation de ${reservation.nom_prenom} marquée comme livrée.`);
  } catch (err) {
    console.error('[Reservation] livrer :', err);
    return redirectMsg(req, res, 'danger', `Erreur : ${err.message}`);
  }
};

// ── GET /reservations/jour ────────────────────────────────────────────────────
exports.jour = async (req, res) => {
  try {
    const aujourdhui = today();
    const [duJour, enRetard] = await Promise.all([
      Reservation.findAll({
        where: { date_livraison: aujourdhui },
        order: [['createdAt', 'DESC']],
      }),
      Reservation.findAll({
        where: {
          date_livraison: { [Op.lt]: aujourdhui },
          is_livre: false,
        },
        order: [['date_livraison', 'ASC']],
      }),
    ]);
    res.render('reservations/jour', renderVars(req, {
      duJour,
      enRetard,
      aujourdhui,
      pageTitle: 'Réservations du jour',
    }));
  } catch (err) {
    console.error('[Reservation] jour :', err);
    res.render('reservations/jour', renderVars(req, {
      duJour: [], enRetard: [], aujourdhui: today(),
      pageTitle: 'Réservations du jour',
      error: err.message,
    }));
  }
};

// ── GET /reservations/non-livrees ─────────────────────────────────────────────
exports.nonLivrees = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      where: { is_livre: false },
      order: [['date_livraison', 'ASC']],
    });
    res.render('reservations/non-livrees', renderVars(req, {
      reservations,
      pageTitle: 'Réservations non livrées',
    }));
  } catch (err) {
    console.error('[Reservation] non-livrees :', err);
    res.render('reservations/non-livrees', renderVars(req, {
      reservations: [],
      pageTitle: 'Réservations non livrées',
      error: err.message,
    }));
  }
};

// ── GET /reservations/livrees ─────────────────────────────────────────────────
exports.livrees = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      where: { is_livre: true },
      order: [['updatedAt', 'DESC']],
    });
    res.render('reservations/livrees', renderVars(req, {
      reservations,
      pageTitle: 'Réservations livrées',
    }));
  } catch (err) {
    console.error('[Reservation] livrees :', err);
    res.render('reservations/livrees', renderVars(req, {
      reservations: [],
      pageTitle: 'Réservations livrées',
      error: err.message,
    }));
  }
};
