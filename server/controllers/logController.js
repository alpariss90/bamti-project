const { Op, fn, col, where } = require('sequelize');
const { User, UserLog } = require('../models');
const { aujourdhui, timezone } = require('../services/rapport/periode');

// =======================
// Liste des utilisateurs + historique des connexions d'un utilisateur à une date
// GET /logs/index?user=ID&date=YYYY-MM-DD
// =======================
exports.index = async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : aujourdhui();
  const idUser = parseInt(req.query.user, 10) || null;

  try {
    const users = await User.findAll({
      attributes: ['id', 'nom', 'login', 'profil', 'isActive'],
      order: [['nom', 'ASC']]
    });

    let utilisateur = null;
    let logs = [];

    if (idUser) {
      utilisateur = users.find(u => u.id === idUser) || null;
      if (utilisateur) {
        logs = await UserLog.findAll({
          where: {
            id_user: idUser,
            [Op.and]: [where(fn('DATE', col('date_action')), date)]
          },
          order: [['date_action', 'ASC']]
        });
      }
    }

    res.render('logs/index', {
      users,
      utilisateur,
      logs,
      date,
      timezone: timezone(),
      message: req.flash('message')[0] || null,
      pageTitle: 'Logs de connexion'
    });
  } catch (err) {
    console.error('Erreur chargement des logs de connexion :', err);
    req.flash('message', { text: 'Erreur serveur lors du chargement des logs.', type: 'danger' });
    return res.redirect('/');
  }
};
