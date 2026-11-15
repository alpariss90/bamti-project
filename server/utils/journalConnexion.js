const { UserLog } = require('../models');
const { enregistrerActivite, oublierActivite } = require('./activiteUtilisateur');

// Enregistre une connexion ou une déconnexion.
// Ne lève jamais d'erreur : un problème de journalisation ne doit pas bloquer l'utilisateur.
async function journaliserConnexion(req, id_user, action, source = 'web') {
  try {
    await UserLog.create({
      id_user,
      action,
      source,
      ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 45) || null,
      user_agent: (req.headers['user-agent'] || '').slice(0, 255) || null,
      date_action: new Date()
    });
  } catch (err) {
    console.error(`[Logs] Impossible d'enregistrer la ${action} de l'utilisateur ${id_user} :`, err);
  }

  // Une connexion compte comme activité immédiate ; une déconnexion réinitialise le suivi
  oublierActivite(id_user);
  if (action === 'connexion') enregistrerActivite(id_user, source);
}

module.exports = { journaliserConnexion };
