const { Op, fn, col, where } = require('sequelize');
const { User, UserLog } = require('../models');
const { aujourdhui, timezone } = require('../services/rapport/periode');
const { delaiConnexionMinutes } = require('../utils/activiteUtilisateur');

// Utilisateurs actuellement connectés : actifs dans les X dernières minutes
// et dont le dernier événement du journal n'est pas une déconnexion.
async function getUtilisateursConnectes(users) {
  const maintenant = Date.now();
  const limite = maintenant - delaiConnexionMinutes() * 60 * 1000;
  const actifs = users.filter(u => u.derniere_activite && new Date(u.derniere_activite).getTime() >= limite);

  const connectes = await Promise.all(actifs.map(async u => {
    const [dernierLog, derniereConnexion] = await Promise.all([
      UserLog.findOne({ where: { id_user: u.id }, order: [['date_action', 'DESC'], ['id', 'DESC']] }),
      UserLog.findOne({ where: { id_user: u.id, action: 'connexion' }, order: [['date_action', 'DESC'], ['id', 'DESC']] })
    ]);
    if (dernierLog && dernierLog.action === 'deconnexion') return null;

    return {
      id: u.id,
      nom: u.nom,
      login: u.login,
      profil: u.profil,
      source: u.derniere_source,
      derniere_activite: u.derniere_activite,
      inactif_minutes: Math.floor((maintenant - new Date(u.derniere_activite).getTime()) / 60000),
      connecte_depuis: derniereConnexion ? derniereConnexion.date_action : null,
      ip: derniereConnexion ? derniereConnexion.ip : null
    };
  }));

  return connectes
    .filter(Boolean)
    .sort((a, b) => new Date(b.derniere_activite) - new Date(a.derniere_activite));
}

// =======================
// Liste des utilisateurs + historique des connexions d'un utilisateur à une date
// GET /logs/index?user=ID&date=YYYY-MM-DD
// =======================
exports.index = async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : aujourdhui();
  const idUser = parseInt(req.query.user, 10) || null;

  try {
    const users = await User.findAll({
      attributes: ['id', 'nom', 'login', 'profil', 'isActive', 'derniere_activite', 'derniere_source'],
      order: [['nom', 'ASC']]
    });

    const connectes = await getUtilisateursConnectes(users);

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
      connectes,
      delaiConnexion: delaiConnexionMinutes(),
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
