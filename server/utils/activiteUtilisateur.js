const { User } = require('../models');

// On n'écrit la dernière activité qu'une fois par minute et par utilisateur,
// pour ne pas faire une requête UPDATE à chaque page ouverte.
const INTERVALLE_ECRITURE_MS = 60 * 1000;
const derniereEcriture = new Map(); // id_user -> timestamp de la dernière écriture

// Enregistre la dernière activité d'un utilisateur. Ne lève jamais d'erreur et ne bloque pas la requête.
function enregistrerActivite(id_user, source = 'web') {
  if (!id_user) return;

  const maintenant = Date.now();
  if (maintenant - (derniereEcriture.get(id_user) || 0) < INTERVALLE_ECRITURE_MS) return;
  derniereEcriture.set(id_user, maintenant);

  // silent : ne pas modifier updatedAt, qui trace les modifications de la fiche utilisateur
  User.update(
    { derniere_activite: new Date(maintenant), derniere_source: source },
    { where: { id: id_user }, silent: true }
  ).catch(err => {
    console.error(`[Activité] Impossible d'enregistrer l'activité de l'utilisateur ${id_user} :`, err.message);
  });
}

// À la déconnexion : la prochaine activité (nouvelle connexion) sera écrite immédiatement
function oublierActivite(id_user) {
  derniereEcriture.delete(id_user);
}

// Délai d'inactivité (en minutes) au-delà duquel un utilisateur n'est plus considéré comme connecté
function delaiConnexionMinutes() {
  const minutes = parseInt(process.env.CONNEXION_ACTIVE_MINUTES, 10);
  return minutes > 0 ? minutes : 15;
}

module.exports = { enregistrerActivite, oublierActivite, delaiConnexionMinutes };
