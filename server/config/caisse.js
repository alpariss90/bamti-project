// Clôture de caisse (controllers/caisseController.js, services/caisse.js)

module.exports = {
  // Premier jour qu'on peut clôturer (mise en production de la fonctionnalité).
  // Les jours précédents sont ignorés : pas de clôture, pas de blocage des paiements, rien dans le suivi.
  DATE_DEBUT: '2026-10-25',

  // Qui peut recevoir une remise, selon le profil de l'expéditeur
  DESTINATAIRES: {
    caissier:     ['gestionnaire', 'admin'],
    gestionnaire: ['gestionnaire', 'admin']
  }
};
