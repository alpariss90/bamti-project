/**
 * Controller admin — Recette des revendeurs
 * Recette du jour & recette par période
 */
const db = require('../models');
const { Vente, Paiement, Client, User, Revendeur } = db;
const { Op } = require('sequelize');

function _buildStats(ventes, gainParSachet) {
  let totalVente = 0, totalEncaisse = 0, totalReste = 0, totalQte = 0;
  const rows = ventes.map(v => {
    const montantTotal = v.quantite * v.prix_unitaire;
    const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
    const reste = montantTotal - montantPayes;
    totalVente    += montantTotal;
    totalEncaisse += montantPayes;
    totalReste    += reste;
    totalQte      += v.quantite;
    return { ...v.toJSON(), montantTotal, montantPayes, reste };
  });
  const gainRevendeur = totalQte * Number(gainParSachet || 0);
  return { ventes: rows, totaux: { totalVente, totalEncaisse, totalReste, totalQte, gainRevendeur } };
}

// GET /revendeurs/recette/jour
exports.recetteJour = async (req, res) => {
  try {
    const revendeurs = await Revendeur.findAll({
      where: { deletedAt: null },
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
      order: [['nom', 'ASC']]
    });

    const id_revendeur = req.query.id_revendeur || '';
    let ventesData = [], totaux = {}, revendeurChoisi = null;

    if (id_revendeur) {
      const rev = revendeurs.find(r => r.id == id_revendeur);
      revendeurChoisi = rev;

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

      const ventes = await Vente.findAll({
        where: {
          user: rev?.id_user,
          date_vente: { [Op.between]: [today, tomorrow] }
        },
        include: [
          { model: Client, attributes: ['id', 'nom', 'prenom'] },
          { model: Paiement, attributes: ['montant', 'date'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      ({ ventes: ventesData, totaux } = _buildStats(ventes, rev?.gain_par_sachet));
    }

    res.render('revendeurs/recette_jour', {
      revendeurs, id_revendeur,
      revendeurChoisi, ventes: ventesData, totaux,
      message: null,
      pageTitle: 'Recette du jour — Revendeur'
    });
  } catch (err) {
    console.error('[RecetteJour]', err);
    req.flash('message', { text: 'Erreur serveur.', type: 'danger' });
    res.redirect('/revendeurs/index');
  }
};

// GET /revendeurs/recette/periode
exports.recettePeriode = async (req, res) => {
  try {
    const revendeurs = await Revendeur.findAll({
      where: { deletedAt: null },
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
      order: [['nom', 'ASC']]
    });

    const { id_revendeur = '', date_debut = '', date_fin = '' } = req.query;
    let ventesData = [], totaux = {}, revendeurChoisi = null;

    if (id_revendeur && date_debut && date_fin) {
      const rev = revendeurs.find(r => r.id == id_revendeur);
      revendeurChoisi = rev;

      const ventes = await Vente.findAll({
        where: {
          user: rev?.id_user,
          date_vente: { [Op.between]: [new Date(date_debut), new Date(date_fin)] }
        },
        include: [
          { model: Client, attributes: ['id', 'nom', 'prenom'] },
          { model: Paiement, attributes: ['montant', 'date'] }
        ],
        order: [['date_vente', 'DESC']]
      });

      ({ ventes: ventesData, totaux } = _buildStats(ventes, rev?.gain_par_sachet));
    }

    const today = new Date().toISOString().split('T')[0];

    res.render('revendeurs/recette_periode', {
      revendeurs, id_revendeur,
      date_debut: date_debut || today,
      date_fin:   date_fin   || today,
      revendeurChoisi, ventes: ventesData, totaux,
      message: null,
      pageTitle: 'Recette par période — Revendeur'
    });
  } catch (err) {
    console.error('[RecettePeriode]', err);
    req.flash('message', { text: 'Erreur serveur.', type: 'danger' });
    res.redirect('/revendeurs/index');
  }
};
