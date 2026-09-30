const { getAlertesStockCritique } = require('../controllers/materielController');
const { getAlertesStockMatiere } = require('../controllers/mvtMatiereController');
const { enregistrerActivite } = require('../utils/activiteUtilisateur');
const { peut } = require('./autorise');

module.exports = async (req, res, next) => {
  // Disponible dans toutes les vues : <% if (peut('depenses.valider')) { %> …
  res.locals.peut = (permission) => peut(req, permission);

  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
    enregistrerActivite(req.session.user.id, 'web');

    if (peut(req, 'alerte_stock') && req.session.showStockAlert) {
      req.session.showStockAlert = false;
      try {
        res.locals.stockAlerts = await getAlertesStockCritique();
      } catch (err) {
        console.error('Erreur lors du calcul des alertes de stock matériel :', err);
        res.locals.stockAlerts = [];
      }
      try {
        res.locals.matiereAlerts = await getAlertesStockMatiere();
      } catch (err) {
        console.error('Erreur lors du calcul des alertes de stock matière :', err);
        res.locals.matiereAlerts = [];
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

