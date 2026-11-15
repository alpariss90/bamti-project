// Envoi des rapports par email (SMTP configuré dans .env)
const nodemailer = require('nodemailer');

let transporteur = null;

function getTransporteur() {
  if (transporteur) return transporteur;

  const { SMTP_HOST, SMTP_PORT = '465', SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('Configuration SMTP incomplète : SMTP_HOST, SMTP_USER et SMTP_PASSWORD sont requis dans .env.');
  }

  const port = parseInt(SMTP_PORT, 10);
  transporteur = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // SSL direct sur 465, STARTTLS sur les autres ports
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
  });
  return transporteur;
}

function destinataires() {
  const liste = (process.env.RAPPORT_EMAIL_DESTINATAIRE || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
  if (liste.length === 0) {
    throw new Error('Aucun destinataire : renseignez RAPPORT_EMAIL_DESTINATAIRE dans .env.');
  }
  return liste;
}

async function envoyerMail({ sujet, html, pieceJointe }) {
  const to = destinataires();
  await getTransporteur().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to.join(', '),
    subject: sujet,
    html,
    attachments: [pieceJointe]
  });
  return to;
}

module.exports = { envoyerMail };
