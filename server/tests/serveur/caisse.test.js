// Clôture de caisse : clôturer sa journée, remettre l'argent, recevoir / refuser / annuler une remise.
const { viderBase, connecterWeb, creerClient, db, fermer } = require('../helpers/base');
const { aujourdhui, ajouterJours } = require('../../services/rapport/periode');

const { Vente, CaisseJournee, CaisseRemise } = db;

let caissier;
let gestionnaire;
let client;

beforeEach(async () => {
  await viderBase();
  caissier = await connecterWeb('caissier');
  gestionnaire = await connecterWeb('gestionnaire');
  client = await creerClient();
});

afterAll(fermer);

// Le caissier encaisse une vente du jour (quantite × 25 F)
function encaisser(quantite = 40) {
  return caissier.agent.post('/ventes/createOrUpdateCaissier').type('form')
    .send({ id_client: client.id, type_vente: 'usine', quantite, prix_unitaire: 25, type_paiement: 'total' });
}

function cloturer(champs = {}) {
  return caissier.agent.post('/caisse/cloturer').type('form')
    .send({ date: aujourdhui(), id_destinataire: gestionnaire.user.id, montant: '1000', commentaire: '', ...champs });
}

test('clôture : journée créée chez le caissier, remise en attente vers le gestionnaire', async () => {
  await encaisser();
  await cloturer();
  const journee = await CaisseJournee.findOne();
  expect(journee).toMatchObject({ id_user: caissier.user.id, montant_encaisse: 1000, id_detenteur: caissier.user.id });
  const remise = await CaisseRemise.findOne();
  expect(remise).toMatchObject({ id_expediteur: caissier.user.id, id_destinataire: gestionnaire.user.id, statut: 'en_attente' });
});

test('une journée ne se clôture qu\'une fois', async () => {
  await encaisser();
  await cloturer();
  await cloturer();
  expect(await CaisseJournee.count()).toBe(1);
});

test('après clôture, plus de vente encaissée ce jour-là', async () => {
  await encaisser();
  await cloturer();
  await encaisser(10);
  expect(await Vente.count()).toBe(1);
});

test.each([
  ['rien encaissé', {}, false],
  ['journée future', { date: ajouterJours(aujourdhui(), 1) }, true],
  ['écart sans commentaire', { montant: '900' }, true],
  ['montant supérieur à l\'encaissé', { montant: '1500' }, true],
])('clôture refusée : %s', async (_libelle, champs, avecVente) => {
  if (avecVente) await encaisser();
  await cloturer(champs);
  expect(await CaisseRemise.count()).toBe(0);
});

test('écart expliqué par un commentaire : accepté', async () => {
  await encaisser();
  await cloturer({ montant: '900', commentaire: '100 F de monnaie manquante' });
  expect(await CaisseRemise.count()).toBe(1);
});

test('le gestionnaire reçoit : l\'argent passe chez lui', async () => {
  await encaisser();
  await cloturer();
  const remise = await CaisseRemise.findOne();
  await gestionnaire.agent.post(`/caisse/remises/${remise.id}/accepter`).type('form').send({});
  await remise.reload();
  expect(remise.statut).toBe('recue');
  const journee = await CaisseJournee.findOne();
  expect([journee.id_detenteur, journee.montant_detenu]).toEqual([gestionnaire.user.id, 1000]);
});

test('refus sans motif impossible ; avec motif, l\'argent reste chez le caissier', async () => {
  await encaisser();
  await cloturer();
  const remise = await CaisseRemise.findOne();
  await gestionnaire.agent.post(`/caisse/remises/${remise.id}/refuser`).type('form').send({ commentaire_refus: '' });
  await remise.reload();
  expect(remise.statut).toBe('en_attente');
  await gestionnaire.agent.post(`/caisse/remises/${remise.id}/refuser`).type('form').send({ commentaire_refus: 'il manque 100 F' });
  await remise.reload();
  expect(remise.statut).toBe('refusee');
  expect((await CaisseJournee.findOne()).id_detenteur).toBe(caissier.user.id);
});

test('seul le destinataire peut recevoir', async () => {
  await encaisser();
  await cloturer();
  const autre = await connecterWeb('gestionnaire');
  const remise = await CaisseRemise.findOne();
  await autre.agent.post(`/caisse/remises/${remise.id}/accepter`).type('form').send({});
  await remise.reload();
  expect(remise.statut).toBe('en_attente');
});

test('l\'expéditeur annule tant que la remise n\'est pas reçue', async () => {
  await encaisser();
  await cloturer();
  const remise = await CaisseRemise.findOne();
  await caissier.agent.post(`/caisse/remises/${remise.id}/annuler`).type('form').send({});
  await remise.reload();
  expect(remise.statut).toBe('annulee');
});

test('un caissier ne peut pas ouvrir « À recevoir »', async () => {
  const res = await caissier.agent.get('/caisse/recevoir');
  expect(res.headers.location).toBe('/dashboard/index');
});

test('les pages caisse affichent la journée', async () => {
  await encaisser();
  expect((await caissier.agent.get('/caisse/index')).status).toBe(200);
  await cloturer();
  const suivi = await gestionnaire.agent.get('/caisse/suivi');
  expect(suivi.status).toBe(200);
  expect((await gestionnaire.agent.get('/caisse/recevoir')).text).toContain(caissier.user.nom);
});
