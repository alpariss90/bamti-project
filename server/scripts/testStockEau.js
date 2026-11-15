// Vérifie les règles du stock d'eau réel (services/stockEau.js) sur la vraie base, sans rien y laisser :
// tout se passe dans une transaction annulée à la fin.
// Usage : node scripts/testStockEau.js
// Prérequis : les tables bons_enlevement, mouvements_stock et inventaires (commandes.txt, section Étape 0).
const crypto = require('crypto');
const db = require('../models');
const stock = require('../services/stockEau');

const { sequelize, User } = db;

let reussis = 0;
let echecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    reussis++;
    console.log(`  OK    ${libelle}`);
  } else {
    echecs++;
    console.log(`  ÉCHEC ${libelle}${detail ? ` (${detail})` : ''}`);
  }
}

// La fonction doit être refusée avec une ErreurStock dont le message contient `extrait`
async function verifierRefus(libelle, appel, extrait) {
  try {
    await appel();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (err) {
    const ok = err instanceof stock.ErreurStock && err.message.includes(extrait);
    verifier(libelle, ok, ok ? '' : err.message);
    if (ok) console.log(`        message : « ${err.message} »`);
  }
}

async function main() {
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({ order: [['id', 'ASC']], transaction: t });
    const id_user = user ? user.id : 1;
    const depart = await stock.calculerStocks(t);
    console.log(`\nStock au départ : physique ${depart.physique}, engagé ${depart.engage}, disponible ${depart.disponible}\n`);

    console.log('1. Lecture des codes');
    verifier('saisie à la main avec espace', stock.normaliserCode('48210 93756') === '4821093756');
    verifier('saisie à la main avec tiret', stock.normaliserCode('48210-93756') === '4821093756');
    verifier('lecteur QWERTY sur PC AZERTY', stock.normaliserCode('_çà&&&&à\'_"(&') === '8901111048351');
    verifier('format imprimé', stock.formaterCode('4821093756') === '48210 93756');

    console.log('\n2. Création d\'un bon de 100 sachets');
    const bon = await stock.creerBon({ origine_type: 'vente', origine_id: 999999, beneficiaire: 'Client test', quantite: 100, id_user }, t);
    verifier('code de 10 chiffres', /^\d{10}$/.test(bon.code), bon.code);
    verifier('statut ouvert', bon.statut === 'ouvert');
    verifier('bon retrouvé par son code', (await stock.trouverBon(stock.formaterCode(bon.code), t))?.id === bon.id);
    let s = await stock.calculerStocks(t);
    verifier('stock physique inchangé', s.physique === depart.physique);
    verifier('stock engagé +100', s.engage === depart.engage + 100, `${s.engage}`);
    await verifierRefus('origine inconnue refusée', () => stock.creerBon({ origine_type: 'xxx', quantite: 5 }, t), 'Origine');
    await verifierRefus('quantité 0 refusée', () => stock.creerBon({ origine_type: 'vente', quantite: 0 }, t), 'quantité');

    console.log('\n3. Enlèvement partiel de 60');
    const uuid = crypto.randomUUID();
    const e1 = await stock.enlever({ code: bon.code, quantite: 60, id_user, uuid }, t);
    verifier('statut partiel', e1.bon.statut === 'partiel');
    verifier('reste 40', stock.resteBon(e1.bon) === 40);
    s = await stock.calculerStocks(t);
    verifier('stock physique −60', s.physique === depart.physique - 60, `${s.physique}`);
    verifier('stock engagé +40', s.engage === depart.engage + 40, `${s.engage}`);
    const e1bis = await stock.enlever({ code: bon.code, quantite: 60, id_user, uuid }, t);
    verifier('même uuid renvoyé deux fois : compté une seule fois', e1bis.dejaEnregistre && (await stock.calculerStocks(t)).physique === s.physique);
    await verifierRefus('enlever plus que le reste refusé', () => stock.enlever({ id_bon: bon.id, quantite: 50, id_user }, t), 'reste que 40');

    console.log('\n4. Retour de 20 sachets');
    const r1 = await stock.retourner({ id_bon: bon.id, quantite: 20, id_user, motif: 'test' }, t);
    verifier('reste 60', stock.resteBon(r1.bon) === 60);
    verifier('stock physique −40', (await stock.calculerStocks(t)).physique === depart.physique - 40);
    await verifierRefus('ramener plus que l\'enlevé refusé', () => stock.retourner({ id_bon: bon.id, quantite: 500, id_user }, t), 'impossible');

    console.log('\n5. Solde du bon puis nouveau scan');
    const e2 = await stock.enlever({ id_bon: bon.id, quantite: 60, id_user }, t);
    verifier('statut soldé', e2.bon.statut === 'solde');
    await verifierRefus('bon soldé refusé', () => stock.enlever({ id_bon: bon.id, quantite: 1, id_user }, t), 'déjà été entièrement retiré');
    const e3 = await stock.enlever({ id_bon: bon.id, quantite: 5, id_user, accepterDepassement: true }, t);
    verifier('hors ligne : dépassement accepté en anomalie', e3.mouvement.anomalie === true);

    console.log('\n6. Annulation d\'un bon');
    const bon2 = await stock.creerBon({ origine_type: 'reservation', quantite: 30, id_user }, t);
    const avantAnnul = await stock.calculerStocks(t);
    await stock.annulerBon(bon2.id, t);
    const apresAnnul = await stock.calculerStocks(t);
    verifier('le reste n\'est plus engagé', apresAnnul.engage === avantAnnul.engage - 30);
    verifier('stock physique inchangé', apresAnnul.physique === avantAnnul.physique);
    await verifierRefus('bon annulé refusé au scan', () => stock.enlever({ id_bon: bon2.id, quantite: 1, id_user }, t), 'annulé');

    console.log('\n7. Perte');
    await verifierRefus('perte sans motif refusée', () => stock.enregistrerPerte({ quantite: 3, id_user }, t), 'motif');
    const avantPerte = (await stock.calculerStocks(t)).physique;
    await stock.enregistrerPerte({ quantite: 3, motif: 'sachets percés', id_user }, t);
    verifier('stock physique −3', (await stock.calculerStocks(t)).physique === avantPerte - 3);

    console.log('\n8. Inventaire');
    // Comptage toujours positif, même si le stock calculé de la base de test est négatif
    const calcule = (await stock.calculerStocks(t)).physique;
    const compte = Math.max(calcule, 0) + 12;
    const inv = await stock.enregistrerInventaire({ stock_compte: compte, observation: 'test', id_user }, t);
    verifier(`écart ${compte - calcule} enregistré`, inv.ecart === compte - calcule && inv.stock_calcule === calcule);
    verifier('stock physique = comptage', (await stock.calculerStocks(t)).physique === compte);
    await verifierRefus('comptage négatif refusé', () => stock.enregistrerInventaire({ stock_compte: -1, id_user }, t), 'entier');
  } catch (err) {
    echecs++;
    console.error('\nErreur inattendue :', err);
  } finally {
    await t.rollback();
    console.log(`\n${reussis} vérification(s) réussie(s), ${echecs} échec(s). Base remise dans son état initial.`);
    await sequelize.close();
    process.exit(echecs ? 1 : 0);
  }
}

main();
