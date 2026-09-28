// Rapports d'activité automatiques (journalier, hebdomadaire, mensuel) envoyés par email.
//
// Fonctionnement : toutes les 30 minutes (et une minute après le démarrage), on vérifie
// pour chaque type si le rapport de la dernière période complète a été envoyé. S'il ne
// l'a pas été et qu'il est au moins RAPPORT_HEURE_ENVOI (06h par défaut), on l'envoie.
// Le même mécanisme assure donc l'envoi à l'heure prévue, le rattrapage après un arrêt
// du serveur et les nouvelles tentatives après un échec.
const cron = require('node-cron');
const { UniqueConstraintError } = require('sequelize');
const { RapportEnvoye } = require('../../models');
const { collecterDonnees } = require('./donnees');
const { genererDocument, fmt } = require('./pdf');
const { envoyerMail } = require('./mail');
const periodes = require('./periode');

const MAX_TENTATIVES = 5;
const DELAI_EN_COURS_MS = 30 * 60 * 1000; // un envoi "en_cours" plus vieux est considéré comme bloqué

// Génère le rapport d'une période et retourne le fichier (sans l'envoyer)
async function genererRapport(periode) {
  const donnees = await collecterDonnees(periode);
  const fichier = await genererDocument(periode, donnees);
  fichier.nom = `rapport_${periode.type}_${periode.debut}.${fichier.extension}`;
  return { donnees, fichier };
}

// Génère et envoie le rapport d'une période. Retourne la liste des destinataires.
async function envoyerRapport(periode) {
  const { donnees, fichier } = await genererRapport(periode);
  const titre = `${periodes.titreRapport(periode.type)} ${periode.libelle}`;

  const html = `
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint le <strong>${titre.toLowerCase()}</strong> de l'Entreprise BAMTI.</p>
    <ul>
      <li>Ventes : <strong>${fmt(donnees.ventes.montant)} F</strong> (${fmt(donnees.ventes.qte)} sachets)</li>
      <li>Encaissements réels : <strong>${fmt(donnees.encaissements.total)} F</strong></li>
      <li>Dépenses : <strong>${fmt(donnees.depenses.total)} F</strong></li>
      <li>Solde de caisse : <strong>${fmt(donnees.encaissements.total - donnees.depenses.total)} F</strong></li>
      <li>Stock de sachets en fin de période : <strong>${fmt(donnees.stock.final)}</strong></li>
    </ul>
    <p style="color:#888;font-size:12px">Message envoyé automatiquement par la plateforme BAMTI.</p>`;

  return envoyerMail({
    sujet: `[BAMTI] ${titre}`,
    html,
    pieceJointe: { filename: fichier.nom, content: fichier.buffer, contentType: fichier.contentType }
  });
}

// Prend le "verrou" d'envoi d'une période dans le journal.
// Retourne la ligne du journal, ou null si le rapport est déjà envoyé / en cours / abandonné.
async function prendreVerrou(periode) {
  const ligne = await RapportEnvoye.findOne({ where: { type: periode.type, date_debut: periode.debut } });

  if (!ligne) {
    try {
      return await RapportEnvoye.create({
        type: periode.type, date_debut: periode.debut, date_fin: periode.fin, statut: 'en_cours', tentatives: 1
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) return null; // un autre processus vient de le prendre
      throw err;
    }
  }

  if (ligne.statut === 'envoye' || ligne.tentatives >= MAX_TENTATIVES) return null;
  if (ligne.statut === 'en_cours' && Date.now() - new Date(ligne.updatedAt).getTime() < DELAI_EN_COURS_MS) return null;

  // Mise à jour conditionnelle : échoue si un autre processus a modifié la ligne entre-temps
  const [modifiees] = await RapportEnvoye.update(
    { statut: 'en_cours', tentatives: ligne.tentatives + 1 },
    { where: { id: ligne.id, statut: ligne.statut, tentatives: ligne.tentatives } }
  );
  return modifiees ? ligne : null;
}

async function traiterRapportAutomatique(type) {
  const periode = periodes.periodePrecedente(type);
  const ligne = await prendreVerrou(periode);
  if (!ligne) return;

  try {
    const to = await envoyerRapport(periode);
    await RapportEnvoye.update(
      { statut: 'envoye', destinataires: to.join(', '), envoye_le: new Date(), message_erreur: null },
      { where: { id: ligne.id } }
    );
    console.log(`[Rapport] ${type} ${periode.debut} envoyé à ${to.join(', ')}`);
  } catch (err) {
    console.error(`[Rapport] Échec de l'envoi ${type} ${periode.debut} :`, err);
    await RapportEnvoye.update(
      { statut: 'echec', message_erreur: String(err.message || err).slice(0, 2000) },
      { where: { id: ligne.id } }
    );
  }
}

async function verifierRapports() {
  const heureEnvoi = parseInt(process.env.RAPPORT_HEURE_ENVOI || '6', 10);
  if (periodes.heureLocale() < heureEnvoi) return;

  for (const type of periodes.TYPES) {
    try {
      await traiterRapportAutomatique(type);
    } catch (err) {
      console.error(`[Rapport] Erreur lors de la vérification du rapport ${type} :`, err);
    }
  }
}

function demarrerPlanification() {
  if (process.env.RAPPORT_ACTIF !== 'true') {
    console.log('[Rapport] Envoi automatique désactivé (RAPPORT_ACTIF != true).');
    return;
  }

  cron.schedule('0,30 * * * *', verifierRapports, {
    name: 'rapports-activite',
    timezone: periodes.timezone(),
    noOverlap: true
  });
  setTimeout(verifierRapports, 60 * 1000);
  console.log(`[Rapport] Envoi automatique activé (fuseau ${periodes.timezone()}).`);
}

// Derniers envois du journal (pour la page d'administration)
function historique(limite = 50) {
  return RapportEnvoye.findAll({ order: [['date_debut', 'DESC'], ['type', 'ASC']], limit: limite });
}

module.exports = {
  genererRapport,
  envoyerRapport,
  demarrerPlanification,
  historique
};
