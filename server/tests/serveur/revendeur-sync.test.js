// Application revendeur : envoi des ventes par uuid (anti-doublon), rechargement du téléphone,
// validation par l'admin (écran /revendeurs/sync) et versement arrivé après la validation.
const crypto = require('crypto');
const { viderBase, connecterWeb, connecterMobile, creerClient, request, app, db, fermer } = require('../helpers/base');

const { Revendeur, Client, ClientTmp, ClientClientTmp, Vente, VenteTmp, Paiement, PaiementTmp } = db;

const D1 = '2026-01-05';
const D2 = '2026-01-06';
const uuid = () => crypto.randomUUID();

let admin;
let mobile;
let revendeur;
let clientGuichet;

beforeEach(async () => {
  await viderBase();
  admin = await connecterWeb('admin');
  mobile = await connecterMobile();
  revendeur = await Revendeur.create({ nom: 'Test', prenom: 'Revendeur', id_user: mobile.user.id, gain_par_sachet: 5 });
  clientGuichet = await creerClient();
});

afterAll(fermer);

const envoyer = (corps, token = mobile.token) =>
  request(app).post('/api/mobile/sync').set('Authorization', `Bearer ${token}`).send(corps);

const recharger = async () =>
  (await request(app).get('/api/mobile/restore').set('Authorization', `Bearer ${mobile.token}`)).body.data;

const valider = (date) =>
  admin.agent.post('/revendeurs/sync').type('form').send({ id_revendeur: revendeur.id, date_sync: date });

// Nouveau client C, deux ventes identiques V1/V2 payées, une vente à crédit V3 (client du guichet)
function premierLot() {
  const ids = { C: uuid(), V1: uuid(), V2: uuid(), V3: uuid(), P1: uuid(), P2: uuid(), P3: uuid() };
  const vente = (u, extra) => ({ uuid: u, type_vente: 'livrer', quantite: 50, prix_unitaire: 25, type_paiement: 'total', date_vente: D1, observation: null, ...extra });
  const corps = {
    clients: [{ uuid: ids.C, nom: 'Nouveau', prenom: 'Client', telephone: null, adresse: null }],
    ventes: [
      vente(ids.V1, { client_uuid: ids.C }),
      vente(ids.V2, { client_uuid: ids.C }),
      vente(ids.V3, { id_client: clientGuichet.id, quantite: 40, type_paiement: 'echellonner' }),
    ],
    paiements: [
      { uuid: ids.P1, vente_uuid: ids.V1, montant: 1250, date: D1, observation: null },
      { uuid: ids.P2, vente_uuid: ids.V2, montant: 1250, date: D1, observation: null },
      { uuid: ids.P3, vente_uuid: ids.V3, montant: 500, date: D1, observation: null },
    ],
  };
  return { ids, corps };
}

describe('envoi depuis le téléphone', () => {
  test('ancienne application (sans uuid) : refusée avec « mettez-la à jour »', async () => {
    const res = await envoyer({ ventes: [{ id_local: -1, id_client: clientGuichet.id, quantite: 10, prix_unitaire: 25, date_vente: D1 }] });
    expect(res.status).toBe(426);
    expect(res.body.message).toMatch(/mettez-la à jour/);
    expect(await VenteTmp.count()).toBe(0);
  });

  test('deux ventes identiques le même jour sont bien deux ventes', async () => {
    const { ids, corps } = premierLot();
    const res = await envoyer(corps);
    expect(res.body.resultats).toMatchObject({ clients: 1, ventes: 3, paiements: 3, erreurs: [] });
    expect(await VenteTmp.count({ where: { uuid: [ids.V1, ids.V2] } })).toBe(2);
  });

  test('renvoi du même lot (coupure réseau) : rien en double', async () => {
    const { corps } = premierLot();
    await envoyer(corps);
    const res = await envoyer(corps);
    expect(res.body.resultats).toMatchObject({ clients: 0, ventes: 0, paiements: 0, deja_recus: 7 });
    expect(res.body.resultats.acceptes.ventes).toHaveLength(3);
    expect(await VenteTmp.count()).toBe(3);
    expect(await PaiementTmp.count()).toBe(3);
  });

  test.each([
    ['au-delà du reste à payer', (ids) => ({ vente_uuid: ids.V3, montant: 600 }), /reste à payer \(500 F\)/],
    ['sur une vente inconnue', () => ({ vente_uuid: uuid(), montant: 100 }), /vente introuvable/],
    ['à 0 F', (ids) => ({ vente_uuid: ids.V3, montant: 0 }), /montant invalide/],
  ])('versement refusé %s', async (_libelle, champs, motif) => {
    const { ids, corps } = premierLot();
    await envoyer(corps);
    const res = await envoyer({ paiements: [{ uuid: uuid(), date: D1, observation: null, ...champs(ids) }] });
    expect(res.body.resultats.paiements).toBe(0);
    expect(res.body.resultats.erreurs[0]).toMatch(motif);
  });

  test('un revendeur ne peut pas payer la vente d\'un autre', async () => {
    const { ids, corps } = premierLot();
    await envoyer(corps);
    const autre = await connecterMobile();
    const res = await envoyer({ paiements: [{ uuid: uuid(), vente_uuid: ids.V3, montant: 100, date: D1, observation: null }] }, autre.token);
    expect(res.body.resultats.erreurs[0]).toMatch(/vente introuvable/);
  });

  test('vente refusée : quantité invalide ou client inconnu', async () => {
    const res = await envoyer({ ventes: [
      { uuid: uuid(), id_client: clientGuichet.id, type_vente: 'usine', quantite: 0, prix_unitaire: 25, type_paiement: 'total', date_vente: D1 },
      { uuid: uuid(), client_uuid: uuid(), type_vente: 'usine', quantite: 5, prix_unitaire: 25, type_paiement: 'total', date_vente: D1 },
    ] });
    expect(res.body.resultats.ventes).toBe(0);
    expect(res.body.resultats.erreurs).toHaveLength(2);
  });
});

describe('rechargement du téléphone', () => {
  test('chaque vente une seule fois, avec son uuid et l\'état « envoyée »', async () => {
    const { ids, corps } = premierLot();
    await envoyer(corps);
    const data = await recharger();
    expect(data.ventes.map((v) => v.uuid).sort()).toEqual([ids.V1, ids.V2, ids.V3].sort());
    expect(data.ventes.every((v) => v.statut === 'envoyee')).toBe(true);
    expect(data.paiements.every((p) => p.vente_uuid && p.statut === 'envoyee')).toBe(true);
    const clientTel = data.clients.find((c) => c.uuid === ids.C);
    expect(clientTel.id).toBeGreaterThan(10000);
    expect(data.ventes.find((v) => v.uuid === ids.V1).id_client).toBe(clientTel.id);
  });

  test('bootstrap renvoie les mêmes données que restore', async () => {
    const { corps } = premierLot();
    await envoyer(corps);
    const boot = await request(app).get('/api/mobile/bootstrap').set('Authorization', `Bearer ${mobile.token}`);
    expect(boot.body.data).toEqual(await recharger());
  });
});

describe('validation par l\'admin', () => {
  test('tableau « En attente de validation » puis validation du jour', async () => {
    const { ids, corps } = premierLot();
    await envoyer(corps);
    const page = await admin.agent.get('/revendeurs/sync');
    expect(page.text).toContain('En attente de validation');
    expect(page.text).toContain('Revendeur Test');

    await valider(D1);
    expect(await Client.count()).toBe(2); // client du guichet + nouveau client
    const v3 = await Vente.findOne({ where: { uuid: ids.V3 } });
    expect(v3).toMatchObject({ type_paiement: 'echellonner', user: mobile.user.id });
    expect((await VenteTmp.findOne({ where: { uuid: ids.V3 } })).id_vente_officielle).toBe(v3.id);
    expect((await Paiement.findOne({ where: { uuid: ids.P3 } })).id_user).toBe(mobile.user.id);
    expect(await PaiementTmp.count({ where: { is_sync: false } })).toBe(0);
    expect((await recharger()).ventes.every((v) => v.statut === 'validee')).toBe(true);
  });

  test('versement tardif sur une vente déjà validée : intégré à la validation de son jour', async () => {
    const { ids, corps } = premierLot();
    await envoyer(corps);
    await valider(D1);

    const P4 = uuid();
    await envoyer({ paiements: [{ uuid: P4, vente_uuid: ids.V3, montant: 500, date: D2, observation: 'solde' }] });
    await valider(D1); // le versement est daté du lendemain : pas encore
    expect(await Paiement.findOne({ where: { uuid: P4 } })).toBeNull();

    await valider(D2);
    const v3 = await Vente.findOne({ where: { uuid: ids.V3 } });
    expect((await Paiement.findOne({ where: { uuid: P4 } })).id_vente).toBe(v3.id);
    expect(v3.type_paiement).toBe('total'); // soldée
  });

  test('versement sur une vente pas encore validée : reste en attente', async () => {
    const V = uuid();
    await envoyer({ ventes: [{ uuid: V, id_client: clientGuichet.id, type_vente: 'usine', quantite: 10, prix_unitaire: 25, type_paiement: 'echellonner', date_vente: D2 }] });
    await envoyer({ paiements: [{ uuid: uuid(), vente_uuid: V, montant: 100, date: D1, observation: null }] });
    const page = await valider(D1);
    expect(page.text).toMatch(/restent en attente/);
    expect(await Paiement.count()).toBe(0);
  });

  test('nouvelle vente pour un client déjà validé : pas de client en double', async () => {
    const { ids, corps } = premierLot();
    await envoyer(corps);
    await valider(D1);
    const lien = await ClientClientTmp.findOne();
    const data = await recharger();
    expect(data.clients.find((c) => c.id === lien.id_client).uuid).toBe(ids.C);

    const V5 = uuid();
    await envoyer({ ventes: [{ uuid: V5, client_uuid: ids.C, type_vente: 'usine', quantite: 5, prix_unitaire: 25, type_paiement: 'total', date_vente: D2 }] });
    await valider(D2);
    expect(await Client.count()).toBe(2);
    expect(await ClientTmp.count({ where: { uuid: ids.C } })).toBe(1);
    expect((await Vente.findOne({ where: { uuid: V5 } })).id_client).toBe(lien.id_client);
  });

  test('une vente validée n\'est jamais validée deux fois', async () => {
    const { corps } = premierLot();
    await envoyer(corps);
    await valider(D1);
    await valider(D1);
    expect(await Vente.count()).toBe(3);
    expect(await Paiement.count()).toBe(3);
  });
});
