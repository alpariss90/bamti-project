const { getAlertesStockCritique } = require('../controllers/materielController');

module.exports = async (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;

    if (req.session.user.profil === 'admin' && req.session.showStockAlert) {
      req.session.showStockAlert = false;
      try {
        res.locals.stockAlerts = await getAlertesStockCritique();
      } catch (err) {
        console.error('Erreur lors du calcul des alertes de stock matériel :', err);
        res.locals.stockAlerts = [];
      }
    }
  } else {
    res.locals.currentUser = null;
  }
/* res.locals.currentUser={
  id: 1, login: "alpariss", profil: "admin"
 }*/
  next();
};
// isAdmin.js
// module.exports = (req, res, next) => {
//   if (req.user.profil !== 'admin') {
//     return res.status(403).json({ message: 'Only super admin can perform this action' });
//   }
//   next();
// };

