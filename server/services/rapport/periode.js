// Calcul des périodes de rapport.
// Toutes les dates sont manipulées sous forme de chaînes 'YYYY-MM-DD' (comme les
// colonnes DATEONLY de la base), dans le fuseau horaire du rapport.

const TYPES = ['journalier', 'hebdomadaire', 'mensuel'];

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function timezone() {
  return process.env.RAPPORT_TIMEZONE || 'Africa/Niamey';
}

// Date du jour dans le fuseau du rapport ('YYYY-MM-DD')
function aujourdhui() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone(), year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

// Heure courante (0-23) dans le fuseau du rapport
function heureLocale() {
  return parseInt(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone(), hour: '2-digit', hourCycle: 'h23'
  }).format(new Date()), 10);
}

function versDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function versChaine(date) {
  return date.toISOString().slice(0, 10);
}

function ajouterJours(str, n) {
  const d = versDate(str);
  d.setUTCDate(d.getUTCDate() + n);
  return versChaine(d);
}

function formatFR(str) {
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// Liste de tous les jours entre debut et fin inclus
function listeJours(debut, fin) {
  const jours = [];
  for (let j = debut; j <= fin; j = ajouterJours(j, 1)) jours.push(j);
  return jours;
}

// Période (jour, semaine lundi→dimanche, ou mois) qui contient la date donnée
function periodeContenant(type, date) {
  let debut, fin;

  if (type === 'journalier') {
    debut = fin = date;
  } else if (type === 'hebdomadaire') {
    const jourSemaine = versDate(date).getUTCDay(); // 0 = dimanche
    debut = ajouterJours(date, -((jourSemaine + 6) % 7));
    fin = ajouterJours(debut, 6);
  } else if (type === 'mensuel') {
    debut = date.slice(0, 8) + '01';
    const d = versDate(debut);
    d.setUTCMonth(d.getUTCMonth() + 1);
    fin = ajouterJours(versChaine(d), -1);
  } else {
    throw new Error(`Type de rapport inconnu : ${type}`);
  }

  return { type, debut, fin, libelle: libellePeriode(type, debut, fin) };
}

// Dernière période complète avant la date de référence (par défaut aujourd'hui) :
// hier, la semaine dernière ou le mois dernier.
function periodePrecedente(type, reference = aujourdhui()) {
  if (type === 'journalier') return periodeContenant(type, ajouterJours(reference, -1));
  if (type === 'hebdomadaire') return periodeContenant(type, ajouterJours(reference, -7));
  if (type === 'mensuel') return periodeContenant(type, ajouterJours(reference.slice(0, 8) + '01', -1));
  throw new Error(`Type de rapport inconnu : ${type}`);
}

function libellePeriode(type, debut, fin) {
  if (type === 'journalier') return `du ${formatFR(debut)}`;
  if (type === 'hebdomadaire') return `du ${formatFR(debut)} au ${formatFR(fin)}`;
  const [y, m] = debut.split('-').map(Number);
  return `${MOIS[m - 1]} ${y}`;
}

function titreRapport(type) {
  return {
    journalier: 'Rapport journalier',
    hebdomadaire: 'Rapport hebdomadaire',
    mensuel: 'Rapport mensuel'
  }[type];
}

module.exports = {
  TYPES,
  timezone,
  aujourdhui,
  heureLocale,
  ajouterJours,
  formatFR,
  listeJours,
  periodeContenant,
  periodePrecedente,
  titreRapport
};
