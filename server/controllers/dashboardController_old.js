const db = require('../models');
const { Client, Vente, Salaire, Personnel } = db;
const { Sequelize, Op } = require('sequelize');

/**
 * Redirection avec message flash
 */
function redirectWithMessage(req, res, msg, type = 'success', path = '/dashboard/index') {
  req.flash(type, msg);
  return res.redirect(path);
}

/**
 * Affichage du tableau de bord principal
 */
exports.index = async (req, res) => {
  try {
    // ---  Date courante ---
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // ---  Statistiques globales ---
    const [totalClients, totalVentes, totalSalaires, totalPersonnels] = await Promise.all([
      Client.count({ where: { deletedAt: null } }),
      Vente.count(),
      Salaire.count(),
      Personnel.count()
    ]);

    // ---  Chiffre d'affaires du mois ---
    const totalVentesMois = await Vente.sum('montant', {
      where: Sequelize.and(
        Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('date_vente')), currentMonth),
        Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('date_vente')), currentYear)
      )
    });

    // ---  Top 5 ventes du mois courant ---
    const topVentes = await Vente.findAll({
      attributes: ['id', 'montant', 'montant', 'date_vente'],
      where: Sequelize.and(
        Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('date_vente')), currentMonth),
        Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('date_vente')), currentYear)
      ),
      order: [['montant', 'DESC']],
      limit: 5,
      include: [
        {
          model: Client,
          attributes: ['nom', 'prenom', 'telephone']
        }
      ]
    });

    // --- 📅 Ventes par mois (graphique) ---
    const ventesParMoisRaw = await Vente.findAll({
      attributes: [
        [Sequelize.fn('MONTH', Sequelize.col('date_vente')), 'mois'],
        [Sequelize.fn('SUM', Sequelize.col('montant')), 'total']
      ],
      where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('date_vente')), currentYear),
      group: ['mois'],
      order: [['mois', 'ASC']]
    });

    const ventesParMois = Array(12).fill(0);
    ventesParMoisRaw.forEach(v => {
      const mois = v.getDataValue('mois') - 1;
      ventesParMois[mois] = parseFloat(v.getDataValue('total')) || 0;
    });

    // ---  Statistiques supplémentaires (facultatif) ---
    const salaireMois = await Salaire.sum('montant_salaire', {
      where: {
        mois: currentMonth,
        annee: currentYear
      }
    });

    const depenseTotale = (salaireMois || 0);

    // ---  Rendu de la vue ---
    res.render('dashboard/index', {
      pageTitle: 'Tableau de bord',
      totalClients,
      totalVentes,
      totalSalaires,
      totalPersonnels,
      totalVentesMois: totalVentesMois || 0,
      depenseTotale,
      topVentes,
      ventesParMois,
      user: req.session.user || null,
      message: req.flash('message')[0] || null
    });

  } catch (err) {
    console.error(' Erreur lors du chargement du tableau de bord :', err);
    return redirectWithMessage(req, res, 'Erreur lors du chargement du tableau de bord.', 'danger', '/dashboard/index');
  }
};
