// Clôture de caisse : règles métier (le contrôleur ne fait qu'afficher et rediriger).
//
// Une journée (caisse_journees) = ce qu'une personne a encaissé un jour donné. Elle est créée à la clôture,
// avec une première remise vers un gestionnaire ou un admin. L'argent ne change de main (id_detenteur)
// que lorsque le destinataire accepte la remise ; s'il refuse, il reste chez l'expéditeur, qui renvoie.
// À chaque remise on garde ce que l'expéditeur détenait et ce qu'il a remis : l'écart est suivi avec un commentaire.
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const { DATE_DEBUT, DESTINATAIRES } = require('../config/caisse');
const { aujourdhui } = require('./rapport/periode');

const { User, Paiement, CaisseJournee, CaisseRemise, CaisseRemiseLigne } = db;

// Erreur à afficher telle quelle à l'utilisateur
class ErreurCaisse extends Error {}

// 'AAAA-MM-JJ' à partir d'une chaîne ou d'une date (composantes locales, comme les dates de vente)
function dateISO(d) {
  if (d instanceof Date) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return String(d || '').slice(0, 10);
}

const dateFR = iso => String(iso).slice(0, 10).split('-').reverse().join('/');
const fmt = n => new Intl.NumberFormat('fr-FR').format(n);
const arrondi = n => Math.round(Number(n) * 100) / 100;

// Montant saisi (« 250 000 », « 1500,5 ») -> nombre, ou NaN
function lireMontant(v) {
  const s = String(v ?? '').replace(/[\s  ]/g, '').replace(',', '.');
  return s === '' ? NaN : Number(s);
}

const peutCloturer = profil => !!DESTINATAIRES[profil];

// Total encaissé par un utilisateur un jour donné
async function montantEncaisse(idUser, date, transaction) {
  const total = await Paiement.sum('montant', { where: { id_user: idUser, date: dateISO(date) }, transaction });
  return arrondi(total || 0);
}

// Jours (depuis DATE_DEBUT, jusqu'à aujourd'hui) où l'utilisateur a encaissé sans avoir clôturé
async function journeesACloturer(idUser) {
  const parJour = await Paiement.findAll({
    attributes: ['date', [fn('SUM', col('montant')), 'total']],
    where: { id_user: idUser, date: { [Op.gte]: DATE_DEBUT, [Op.lte]: aujourdhui() } },
    group: ['date'],
    order: [['date', 'ASC']],
    raw: true
  });
  if (!parJour.length) return [];

  const cloturees = await CaisseJournee.findAll({
    attributes: ['date'],
    where: { id_user: idUser, date: { [Op.gte]: DATE_DEBUT } },
    raw: true
  });
  const dejaCloturees = new Set(cloturees.map(j => dateISO(j.date)));

  return parJour
    .map(r => ({ date: dateISO(r.date), montant: arrondi(r.total) }))
    .filter(r => r.montant > 0 && !dejaCloturees.has(r.date));
}

// Refus d'un paiement sur une journée déjà clôturée par l'encaisseur (null si le paiement est autorisé).
// Pas de contrôle pour l'admin (il ne clôture pas), pour un paiement à 0 F, ni avant DATE_DEBUT.
async function verifierJourneeNonCloturee({ user, date, montant, transaction }) {
  if (!user || !peutCloturer(user.profil)) return null;
  if (!(Number(montant) > 0)) return null;
  const jour = dateISO(date);
  if (jour < DATE_DEBUT) return null;

  const journee = await CaisseJournee.findOne({ where: { id_user: user.id, date: jour }, transaction });
  return journee
    ? `Votre journée du ${dateFR(jour)} est déjà clôturée : vous ne pouvez plus enregistrer de paiement à cette date.`
    : null;
}

// Personnes à qui l'utilisateur peut remettre de l'argent
function destinatairesPossibles(user) {
  const profils = DESTINATAIRES[user.profil];
  if (!profils) return Promise.resolve([]);
  return User.findAll({
    attributes: ['id', 'nom', 'profil'],
    where: { profil: profils, isActive: true, id: { [Op.ne]: user.id } },
    order: [['profil', 'ASC'], ['nom', 'ASC']]
  });
}

// Parmi ces journées, celles qui sont déjà dans une remise en attente
async function idsJourneesEnAttente(idsJournees, transaction) {
  if (!idsJournees.length) return new Set();
  const lignes = await CaisseRemiseLigne.findAll({
    attributes: ['id_journee'],
    where: { id_journee: idsJournees },
    include: [{ model: CaisseRemise, as: 'remise', attributes: [], where: { statut: 'en_attente' } }],
    transaction
  });
  return new Set(lignes.map(l => l.id_journee));
}

// Crée une remise de l'expéditeur vers le destinataire.
// lignes : [{ id_journee, montant, commentaire }] — montant au plus ce qu'il détient, commentaire obligatoire en cas d'écart.
async function creerRemise({ expediteur, idDestinataire, lignes, transaction }) {
  const profilsDestinataires = DESTINATAIRES[expediteur.profil];
  if (!profilsDestinataires) throw new ErreurCaisse('Votre profil ne peut pas remettre d’argent.');
  if (!lignes.length) throw new ErreurCaisse('Choisissez au moins une journée à remettre.');

  const destinataire = await User.findOne({
    where: { id: Number(idDestinataire) || 0, isActive: true, profil: profilsDestinataires },
    transaction
  });
  if (!destinataire || destinataire.id === expediteur.id) {
    throw new ErreurCaisse('Choisissez à qui vous remettez l’argent.');
  }

  const ids = lignes.map(l => Number(l.id_journee));
  if (new Set(ids).size !== ids.length) throw new ErreurCaisse('Une journée est en double dans la remise.');

  // Verrou sur les journées : deux remises simultanées de la même journée sont impossibles
  const journees = await CaisseJournee.findAll({ where: { id: ids }, transaction, lock: transaction.LOCK.UPDATE });
  const parId = new Map(journees.map(j => [j.id, j]));
  const enAttente = await idsJourneesEnAttente(ids, transaction);

  const aCreer = lignes.map(l => {
    const journee = parId.get(Number(l.id_journee));
    if (!journee || journee.id_detenteur !== expediteur.id) {
      throw new ErreurCaisse('Une des journées choisies n’est pas (ou plus) chez vous.');
    }
    const quoi = `journée du ${dateFR(journee.date)}`;
    if (enAttente.has(journee.id)) throw new ErreurCaisse(`La ${quoi} est déjà dans une remise en attente.`);

    const detenu = arrondi(journee.montant_detenu);
    const montant = lireMontant(l.montant);
    if (!Number.isFinite(montant) || montant < 0) throw new ErreurCaisse(`Montant remis invalide pour la ${quoi}.`);
    if (arrondi(montant) > detenu) {
      throw new ErreurCaisse(`Pour la ${quoi}, vous ne pouvez pas remettre plus que ${fmt(detenu)} F.`);
    }

    const ecart = arrondi(detenu - montant) > 0;
    const commentaire = String(l.commentaire || '').trim();
    if (ecart && !commentaire) {
      throw new ErreurCaisse(`Pour la ${quoi}, expliquez l’écart de ${fmt(arrondi(detenu - montant))} F dans le commentaire.`);
    }

    return {
      id_journee: journee.id,
      montant_attendu: detenu,
      montant_remis: arrondi(montant),
      commentaire_ecart: ecart ? commentaire : null
    };
  });

  const remise = await CaisseRemise.create({
    id_expediteur: expediteur.id,
    id_destinataire: destinataire.id,
    statut: 'en_attente'
  }, { transaction });
  await CaisseRemiseLigne.bulkCreate(aCreer.map(l => ({ ...l, id_remise: remise.id })), { transaction });

  return { remise, destinataire };
}

// Clôture d'une journée : la journée est créée chez l'utilisateur, puis remise au destinataire (en attente)
async function cloturer({ user, date, idDestinataire, montant, commentaire, transaction }) {
  if (!peutCloturer(user.profil)) throw new ErreurCaisse('Votre profil ne clôture pas de journée.');

  const jour = dateISO(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) throw new ErreurCaisse('Date de clôture invalide.');
  if (jour < DATE_DEBUT) throw new ErreurCaisse(`La clôture n’est possible qu’à partir du ${dateFR(DATE_DEBUT)}.`);
  if (jour > aujourdhui()) throw new ErreurCaisse('Impossible de clôturer une journée future.');

  const existante = await CaisseJournee.findOne({ where: { id_user: user.id, date: jour }, transaction });
  if (existante) throw new ErreurCaisse(`Votre journée du ${dateFR(jour)} est déjà clôturée.`);

  const total = await montantEncaisse(user.id, jour, transaction);
  if (total <= 0) throw new ErreurCaisse(`Vous n’avez rien encaissé le ${dateFR(jour)}.`);

  let journee;
  try {
    journee = await CaisseJournee.create({
      id_user: user.id,
      date: jour,
      montant_encaisse: total,
      id_detenteur: user.id,
      montant_detenu: total
    }, { transaction });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw new ErreurCaisse(`Votre journée du ${dateFR(jour)} est déjà clôturée.`);
    throw err;
  }

  return creerRemise({
    expediteur: user,
    idDestinataire,
    lignes: [{ id_journee: journee.id, montant, commentaire }],
    transaction
  });
}

// Remise en attente adressée à (ou envoyée par) l'utilisateur, verrouillée pour la mise à jour
async function remiseEnAttente(idRemise, transaction) {
  const remise = await CaisseRemise.findByPk(Number(idRemise) || 0, {
    include: [{ model: CaisseRemiseLigne, as: 'lignes' }],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (!remise) throw new ErreurCaisse('Remise introuvable.');
  if (remise.statut !== 'en_attente') throw new ErreurCaisse('Cette remise a déjà été traitée.');
  return remise;
}

// Le destinataire a reçu l'argent : chaque journée passe chez lui, avec le montant remis
async function accepter({ user, idRemise, transaction }) {
  const remise = await remiseEnAttente(idRemise, transaction);
  if (remise.id_destinataire !== user.id) throw new ErreurCaisse('Cette remise ne vous est pas adressée.');

  await remise.update({ statut: 'recue', date_reponse: new Date() }, { transaction });
  for (const l of remise.lignes) {
    await CaisseJournee.update(
      { id_detenteur: user.id, montant_detenu: l.montant_remis },
      { where: { id: l.id_journee }, transaction }
    );
  }
  return remise;
}

// Le destinataire refuse : l'argent reste chez l'expéditeur, qui corrige et renvoie
async function refuser({ user, idRemise, commentaire, transaction }) {
  const motif = String(commentaire || '').trim();
  if (!motif) throw new ErreurCaisse('Indiquez pourquoi vous refusez la remise.');
  const remise = await remiseEnAttente(idRemise, transaction);
  if (remise.id_destinataire !== user.id) throw new ErreurCaisse('Cette remise ne vous est pas adressée.');

  await remise.update({ statut: 'refusee', commentaire_refus: motif, date_reponse: new Date() }, { transaction });
  return remise;
}

// L'expéditeur annule tant que la remise n'a pas été reçue
async function annuler({ user, idRemise, transaction }) {
  const remise = await remiseEnAttente(idRemise, transaction);
  if (remise.id_expediteur !== user.id) throw new ErreurCaisse('Seul l’expéditeur peut annuler cette remise.');

  await remise.update({ statut: 'annulee', date_reponse: new Date() }, { transaction });
  return remise;
}

// Journées que l'utilisateur détient et peut remettre (pas déjà en attente).
// Si sa dernière remise de la journée a été refusée ou annulée, on la joint pour pré-remplir le renvoi.
async function journeesDetenues(user) {
  const journees = await CaisseJournee.findAll({
    where: { id_detenteur: user.id },
    include: [{ model: User, as: 'caissier', attributes: ['id', 'nom'] }],
    order: [['date', 'ASC'], ['id', 'ASC']]
  });
  if (!journees.length) return [];

  const ids = journees.map(j => j.id);
  const enAttente = await idsJourneesEnAttente(ids);
  const libres = journees.filter(j => !enAttente.has(j.id));

  const lignes = await CaisseRemiseLigne.findAll({
    where: { id_journee: libres.map(j => j.id) },
    include: [{ model: CaisseRemise, as: 'remise', include: [{ model: User, as: 'destinataire', attributes: ['id', 'nom'] }] }],
    order: [['id', 'DESC']]
  });
  const derniere = new Map();
  lignes.forEach(l => { if (!derniere.has(l.id_journee)) derniere.set(l.id_journee, l); });

  return libres.map(j => {
    const l = derniere.get(j.id);
    const aRenvoyer = l && l.remise.id_expediteur === user.id && ['refusee', 'annulee'].includes(l.remise.statut);
    return { journee: j, precedente: aRenvoyer ? l : null };
  });
}

// Remises en attente adressées à l'utilisateur (ou envoyées par lui)
function remises({ where, limit }) {
  return CaisseRemise.findAll({
    where,
    include: [
      { model: User, as: 'expediteur', attributes: ['id', 'nom', 'profil'] },
      { model: User, as: 'destinataire', attributes: ['id', 'nom', 'profil'] },
      { model: CaisseRemiseLigne, as: 'lignes', include: [
        { model: CaisseJournee, as: 'journee', include: [{ model: User, as: 'caissier', attributes: ['id', 'nom'] }] }
      ] }
    ],
    order: [['createdAt', 'DESC']],
    limit
  }).then(liste => {
    liste.forEach(r => r.lignes.sort((a, b) => a.id - b.id));
    return liste;
  });
}

// Suivi : journées de la période, avec chez qui est l'argent et l'historique des remises.
// admin : tout ; gestionnaire : ses journées + celles qu'il détient ou qui sont passées par lui ; caissier : ses journées.
async function suivi({ user, du, au, idCaissier }) {
  const where = { date: { [Op.between]: [du, au] } };
  if (idCaissier) where.id_user = Number(idCaissier);

  if (user.profil === 'caissier') {
    where.id_user = user.id;
  } else if (user.profil !== 'admin') {
    const passees = await CaisseRemiseLigne.findAll({
      attributes: ['id_journee'],
      include: [{ model: CaisseRemise, as: 'remise', attributes: [],
        where: { [Op.or]: [{ id_expediteur: user.id }, { id_destinataire: user.id }] } }],
      raw: true
    });
    where[Op.or] = [
      { id_user: user.id },
      { id_detenteur: user.id },
      { id: [...new Set(passees.map(p => p.id_journee))] }
    ];
  }

  return CaisseJournee.findAll({
    where,
    include: [
      { model: User, as: 'caissier', attributes: ['id', 'nom'] },
      { model: User, as: 'detenteur', attributes: ['id', 'nom', 'profil'] },
      { model: CaisseRemiseLigne, as: 'lignes', include: [{ model: CaisseRemise, as: 'remise', include: [
        { model: User, as: 'expediteur', attributes: ['id', 'nom'] },
        { model: User, as: 'destinataire', attributes: ['id', 'nom'] }
      ] }] }
    ],
    order: [['date', 'DESC'], [{ model: User, as: 'caissier' }, 'nom', 'ASC'], [{ model: CaisseRemiseLigne, as: 'lignes' }, 'id', 'ASC']]
  });
}

// Compteurs du menu
function nbRemisesARecevoir(idUser) {
  return CaisseRemise.count({ where: { id_destinataire: idUser, statut: 'en_attente' } });
}

module.exports = {
  ErreurCaisse,
  DATE_DEBUT,
  dateISO,
  dateFR,
  peutCloturer,
  montantEncaisse,
  journeesACloturer,
  verifierJourneeNonCloturee,
  destinatairesPossibles,
  creerRemise,
  cloturer,
  accepter,
  refuser,
  annuler,
  journeesDetenues,
  remises,
  suivi,
  nbRemisesARecevoir
};
