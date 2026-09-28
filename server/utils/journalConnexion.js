const { UserLog } = require('../models');

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
}

module.exports = { journaliserConnexion };
