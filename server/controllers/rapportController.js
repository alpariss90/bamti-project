const rapports = require('../services/rapport');
const periodes = require('../services/rapport/periode');

function redirectWithMessage(req, res, msg, type = 'success', path = '/rapports/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Lit et valide le type + la date de référence envoyés par le formulaire
function lirePeriode(source) {
  const { type, date } = source;
  if (!periodes.TYPES.includes(type)) throw new Error('Type de rapport invalide.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Date invalide.');
  return periodes.periodeContenant(type, date);
}

// =======================
// Page : génération manuelle + historique des envois automatiques
// =======================
exports.index = async (req, res) => {
  try {
    const historique = await rapports.historique();
    res.render('rapports/index', {
      historique,
      dateDefaut: periodes.ajouterJours(periodes.aujourdhui(), -1),
      actif: process.env.RAPPORT_ACTIF === 'true',
      destinataires: process.env.RAPPORT_EMAIL_DESTINATAIRE || '',
      message: req.flash('message')[0] || null,
      pageTitle: 'Rapports d\'activité'
    });
  } catch (err) {
    console.error('Erreur chargement page rapports :', err);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des rapports.', 'danger', '/');
  }
};

// =======================
// Aperçu : renvoie le PDF directement dans le navigateur
// =======================
exports.apercu = async (req, res) => {
  try {
    const periode = lirePeriode(req.query);
    const { fichier } = await rapports.genererRapport(periode);
    const disposition = fichier.extension === 'pdf' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', fichier.contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fichier.nom}"`);
    return res.send(fichier.buffer);
  } catch (err) {
    console.error('Erreur génération aperçu rapport :', err);
    return redirectWithMessage(req, res, `Erreur lors de la génération du rapport : ${err.message}`, 'danger');
  }
};

// =======================
// Envoi manuel par email (non enregistré dans le journal automatique)
// =======================
exports.envoyer = async (req, res) => {
  try {
    const periode = lirePeriode(req.body);
    const to = await rapports.envoyerRapport(periode);
    return redirectWithMessage(req, res, `Rapport ${periode.type} ${periode.libelle} envoyé à ${to.join(', ')}.`);
  } catch (err) {
    console.error('Erreur envoi manuel rapport :', err);
    return redirectWithMessage(req, res, `Erreur lors de l'envoi du rapport : ${err.message}`, 'danger');
  }
};
