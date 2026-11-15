// Stock d'eau réel : règles métier des bons d'enlèvement et des mouvements physiques.
//
// La vente ne touche plus au stock. Chaque source (vente, commande, réservation, ticket, carte) crée
// un bon d'enlèvement ; seul l'enlèvement (scan du bon à l'usine) fait sortir des sachets, pour la
// quantité réellement prise. Un retour remet des sachets en stock et rouvre le bon.
//
//   Stock physique   = production − sorties de l'ancien système + Σ mouvements_stock.quantite (signée)
//   Stock engagé     = reste à enlever des bons ouverts ou partiels
//   Stock disponible = physique − engagé
//
// Toutes les fonctions acceptent une transaction facultative : sans elle, elles ouvrent la leur.
const crypto = require('crypto');
const { Op, fn, literal } = require('sequelize');
const db = require('../models');
const { aujourdhui } = require('./rapport/periode');

const { sequelize, User, BonEnlevement, MouvementStock, Inventaire, StockSachetEntree, StockSachetSortie } = db;

// Erreur à afficher telle quelle à l'utilisateur (web ou application mobile)
class ErreurStock extends Error {}

const ORIGINES = ['vente', 'commande', 'reservation', 'ticket', 'carte_famille', 'carte_prepaye'];
const STATUTS_OUVERTS = ['ouvert', 'partiel'];

const fmt = n => new Intl.NumberFormat('fr-FR').format(n);

// Lecteur code-barres réglé en QWERTY sur un PC AZERTY : les chiffres arrivent en « &é"'(-è_çà »
const AZERTY_VERS_CHIFFRE = { '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0' };

// Code saisi, scanné ou lu au lecteur -> chiffres seuls.
// La conversion AZERTY ne s'applique que si la saisie ne contient aucun chiffre : une saisie à la main
// comme « 48210 93756 » ou « 48210-93756 » garde ses chiffres et perd seulement ses séparateurs.
function normaliserCode(valeur) {
  const s = String(valeur ?? '').trim();
  if (/\d/.test(s)) return s.replace(/\D/g, '');
  return s.split('').map(c => AZERTY_VERS_CHIFFRE[c] ?? '').join('');
}

// Code à imprimer sous le QR : « 48210 93756 »
const formaterCode = code => `${String(code).slice(0, 5)} ${String(code).slice(5)}`;

const entierPositif = v => Number.isInteger(Number(v)) && Number(v) > 0;

function avecTransaction(transaction, travail) {
  return transaction ? travail(transaction) : sequelize.transaction(t => travail(t));
}

const resteBon = bon => Math.max(bon.quantite_due - bon.quantite_enlevee, 0);

// Statut d'un bon selon ce qui a été enlevé (un bon annulé le reste)
function statutSelon(bon) {
  if (bon.statut === 'annule') return 'annule';
  if (bon.quantite_enlevee <= 0) return 'ouvert';
  return bon.quantite_enlevee >= bon.quantite_due ? 'solde' : 'partiel';
}

// 10 chiffres tirés au hasard, impossibles à deviner, uniques en base
async function genererCode(transaction) {
  for (let essai = 0; essai < 5; essai++) {
    const code = String(crypto.randomInt(0, 1e10)).padStart(10, '0');
    const existe = await BonEnlevement.count({ where: { code }, transaction });
    if (!existe) return code;
  }
  throw new Error('Impossible de générer un code de bon unique.');
}

// =======================
// Bons
// =======================

async function creerBon({ origine_type, origine_id, id_client, id_carte, beneficiaire, quantite, date, id_user }, transaction) {
  if (!ORIGINES.includes(origine_type)) throw new ErreurStock(`Origine de bon inconnue : ${origine_type}.`);
  if (!entierPositif(quantite)) throw new ErreurStock('La quantité du bon doit être un nombre entier positif.');

  return avecTransaction(transaction, async t => BonEnlevement.create({
    code: await genererCode(t),
    origine_type,
    origine_id: origine_id || null,
    id_client: id_client || null,
    id_carte: id_carte || null,
    beneficiaire: beneficiaire ? String(beneficiaire).trim().slice(0, 150) : null,
    quantite_due: Number(quantite),
    date_bon: date || aujourdhui(),
    id_user: id_user || null
  }, { transaction: t }));
}

// Bon à partir d'un code saisi ou scanné (null si inconnu)
async function trouverBon(codeSaisi, transaction) {
  const code = normaliserCode(codeSaisi);
  if (!code) return null;
  return BonEnlevement.findOne({ where: { code }, transaction });
}

// Le bon ne peut plus être retiré (ex. vente annulée). Aucun mouvement de stock :
// ce qui a déjà été enlevé est physiquement parti, seul le reste cesse d'être engagé.
async function annulerBon(idBon, transaction) {
  return avecTransaction(transaction, async t => {
    const bon = await BonEnlevement.findByPk(idBon, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bon) throw new ErreurStock('Bon introuvable.');
    if (bon.statut !== 'annule') await bon.update({ statut: 'annule' }, { transaction: t });
    return bon;
  });
}

// Bon verrouillé pour un enlèvement ou un retour, désigné par son id ou son code
async function chargerBonVerrouille({ id_bon, code }, t) {
  const where = id_bon ? { id: id_bon } : { code: normaliserCode(code) };
  const bon = (id_bon || code) ? await BonEnlevement.findOne({ where, transaction: t, lock: t.LOCK.UPDATE }) : null;
  if (!bon) throw new ErreurStock('Bon introuvable. Vérifiez le code.');
  return bon;
}

// Mouvement déjà reçu (même uuid) : renvoyé tel quel, jamais compté deux fois
async function mouvementExistant(uuid, t) {
  return uuid ? MouvementStock.findOne({ where: { uuid }, transaction: t }) : null;
}

// Texte « le 31/10/2026 à 14:12 par Ali » du dernier enlèvement d'un bon
async function dernierEnlevement(bon, t) {
  const dernier = await MouvementStock.findOne({
    where: { id_bon: bon.id, type: 'enlevement' },
    include: [{ model: User, as: 'auteur', attributes: ['nom', 'login'] }],
    order: [['date_operation', 'DESC']],
    transaction: t
  });
  if (!dernier) return '';
  const d = new Date(dernier.date_operation);
  const date = d.toLocaleDateString('fr-FR', { timeZone: 'Africa/Niamey' });
  const heure = d.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Niamey', hour: '2-digit', minute: '2-digit' });
  const qui = dernier.auteur ? (dernier.auteur.nom || dernier.auteur.login) : '';
  return ` le ${date} à ${heure}${qui ? ` par ${qui}` : ''}`;
}

// =======================
// Mouvements
// =======================

// Sortie de sachets sur un bon (scan à l'usine). Quantité au plus égale au reste.
// accepterDepassement : synchronisation d'opérations faites hors ligne — les sachets sont déjà partis,
// on enregistre quand même mais le mouvement est marqué en anomalie pour vérification.
async function enlever({ id_bon, code, quantite, id_user, source = 'web', uuid, date_operation, accepterDepassement = false }, transaction) {
  if (!entierPositif(quantite)) throw new ErreurStock('La quantité à enlever doit être un nombre entier positif.');
  const q = Number(quantite);

  return avecTransaction(transaction, async t => {
    const deja = await mouvementExistant(uuid, t);
    if (deja) return { mouvement: deja, bon: await BonEnlevement.findByPk(deja.id_bon, { transaction: t }), dejaEnregistre: true };

    const bon = await chargerBonVerrouille({ id_bon, code }, t);
    const reste = resteBon(bon);
    let anomalie = false;

    if (bon.statut === 'annule') {
      if (!accepterDepassement) throw new ErreurStock('Ce bon est annulé : aucun sachet ne peut être remis.');
      anomalie = true;
    } else if (reste === 0) {
      if (!accepterDepassement) throw new ErreurStock(`Ce bon a déjà été entièrement retiré${await dernierEnlevement(bon, t)}.`);
      anomalie = true;
    } else if (q > reste) {
      if (!accepterDepassement) throw new ErreurStock(`Il ne reste que ${fmt(reste)} sachet(s) à retirer sur ce bon.`);
      anomalie = true;
    }

    bon.quantite_enlevee += q;
    bon.statut = statutSelon(bon);
    await bon.save({ transaction: t });

    const mouvement = await MouvementStock.create({
      uuid: uuid || crypto.randomUUID(),
      type: 'enlevement',
      quantite: -q,
      id_bon: bon.id,
      id_user,
      source,
      date_operation: date_operation || new Date(),
      anomalie
    }, { transaction: t });

    return { mouvement, bon, dejaEnregistre: false };
  });
}

// Sachets ramenés à l'usine sur un bon : ils rentrent en stock et le bon retrouve son reste.
// Quantité au plus égale à ce qui a été enlevé sur ce bon.
async function retourner({ id_bon, code, quantite, id_user, source = 'web', uuid, date_operation, motif, accepterDepassement = false }, transaction) {
  if (!entierPositif(quantite)) throw new ErreurStock('La quantité ramenée doit être un nombre entier positif.');
  const q = Number(quantite);

  return avecTransaction(transaction, async t => {
    const deja = await mouvementExistant(uuid, t);
    if (deja) return { mouvement: deja, bon: await BonEnlevement.findByPk(deja.id_bon, { transaction: t }), dejaEnregistre: true };

    const bon = await chargerBonVerrouille({ id_bon, code }, t);
    let anomalie = false;
    if (q > bon.quantite_enlevee) {
      if (!accepterDepassement) {
        throw new ErreurStock(`Seulement ${fmt(bon.quantite_enlevee)} sachet(s) ont été retirés sur ce bon : impossible d'en ramener ${fmt(q)}.`);
      }
      anomalie = true;
    }

    bon.quantite_enlevee -= q;
    bon.statut = statutSelon(bon);
    await bon.save({ transaction: t });

    const mouvement = await MouvementStock.create({
      uuid: uuid || crypto.randomUUID(),
      type: 'retour',
      quantite: q,
      id_bon: bon.id,
      id_user,
      source,
      date_operation: date_operation || new Date(),
      anomalie,
      motif: motif ? String(motif).trim().slice(0, 255) : null
    }, { transaction: t });

    return { mouvement, bon, dejaEnregistre: false };
  });
}

// Sachets perdus ou abîmés (percés, casse…) : motif obligatoire
async function enregistrerPerte({ quantite, motif, id_user, source = 'web', uuid, date_operation }, transaction) {
  if (!entierPositif(quantite)) throw new ErreurStock('La quantité perdue doit être un nombre entier positif.');
  if (!String(motif || '').trim()) throw new ErreurStock('Le motif de la perte est obligatoire.');

  return avecTransaction(transaction, async t => {
    const deja = await mouvementExistant(uuid, t);
    if (deja) return deja;
    return MouvementStock.create({
      uuid: uuid || crypto.randomUUID(),
      type: 'perte',
      quantite: -Number(quantite),
      id_user,
      source,
      date_operation: date_operation || new Date(),
      motif: String(motif).trim().slice(0, 255)
    }, { transaction: t });
  });
}

// Comptage physique : l'écart avec le stock calculé est enregistré comme ajustement
async function enregistrerInventaire({ stock_compte, observation, id_user, date }, transaction) {
  const compte = Number(stock_compte);
  if (String(stock_compte ?? '').trim() === '' || !Number.isInteger(compte) || compte < 0) {
    throw new ErreurStock('Le nombre de sachets comptés doit être un nombre entier positif ou nul.');
  }

  return avecTransaction(transaction, async t => {
    const { physique } = await calculerStocks(t);
    const ecart = compte - physique;

    const inventaire = await Inventaire.create({
      date_inventaire: date || aujourdhui(),
      stock_compte: compte,
      stock_calcule: physique,
      ecart,
      observation: observation ? String(observation).trim() : null,
      id_user
    }, { transaction: t });

    if (ecart !== 0) {
      await MouvementStock.create({
        uuid: crypto.randomUUID(),
        type: 'ajustement',
        quantite: ecart,
        id_inventaire: inventaire.id,
        id_user,
        source: 'web',
        date_operation: new Date(),
        motif: `Inventaire du ${String(inventaire.date_inventaire).split('-').reverse().join('/')}`
      }, { transaction: t });
    }

    return inventaire;
  });
}

// =======================
// Calcul du stock
// =======================

async function calculerStocks(transaction) {
  const [entrees, sorties, mouvements, engageRow] = await Promise.all([
    StockSachetEntree.sum('quantite', { transaction }),
    StockSachetSortie.sum('quantite', { transaction }),
    MouvementStock.sum('quantite', { transaction }),
    BonEnlevement.findOne({
      attributes: [[fn('SUM', literal('GREATEST(quantite_due - quantite_enlevee, 0)')), 'engage']],
      where: { statut: { [Op.in]: STATUTS_OUVERTS } },
      raw: true,
      transaction
    })
  ]);

  const physique = (entrees || 0) - (sorties || 0) + (mouvements || 0);
  const engage = Number(engageRow?.engage) || 0;
  return { physique, engage, disponible: physique - engage };
}

module.exports = {
  ErreurStock,
  ORIGINES,
  normaliserCode,
  formaterCode,
  resteBon,
  creerBon,
  trouverBon,
  annulerBon,
  enlever,
  retourner,
  enregistrerPerte,
  enregistrerInventaire,
  calculerStocks
};
