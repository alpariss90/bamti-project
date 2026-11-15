// Ventes au guichet : création, paiement, stock d'eau, interdiction de modifier, annulation, versements.
const { viderBase, connecterWeb, creerClient, db, fermer } = require('../helpers/base');
const { aujourdhui, ajouterJours } = require('../../services/rapport/periode');

const { Vente, Paiement, StockSachetSortie, StockSachetEntree, CaisseJournee, sequelize } = db;

let admin;
let caissier;
let client;

beforeEach(async () => {
  await viderBase();
  admin = await connecterWeb('admin');
  caissier = await connecterWeb('caissier');
  client = await creerClient();
});

afterAll(fermer);

function venteAdmin(champs) {
  return admin.agent.post('/ventes/createOrUpdate').type('form').send({
    id_client: client.id, type_vente: 'usine', quantite: 100, prix_unitaire: 25,
    type_paiement: 'total', date_vente: aujourdhui(), ...champs,
  });
}

describe('création d\'une vente (admin)', () => {
  test('vente payée en totalité : vente, paiement et sortie de stock', async () => {
    const res = await venteAdmin({});
    expect(res.status).toBe(302);
    const vente = await Vente.findOne();
    expect(vente).toMatchObject({ quantite: 100, montant: 2500, type_paiement: 'total', user: admin.user.id });
    const paiements = await Paiement.findAll({ where: { id_vente: vente.id } });
    expect(paiements.map((p) => [p.montant, p.id_user])).toEqual([[2500, admin.user.id]]);
    const sortie = await StockSachetSortie.findOne({ where: { id_vente: vente.id } });
    expect(sortie.quantite).toBe(100);
  });

  test('vente échelonnée avec une première tranche', async () => {
    await venteAdmin({ type_paiement: 'echellonner', montant_paye: '1000' });
    const vente = await Vente.findOne();
    expect(vente.type_paiement).toBe('echellonner');
    expect(await Paiement.sum('montant', { where: { id_vente: vente.id } })).toBe(1000);
  });

  test('vente échelonnée sans rien payer : paiement à 0 F (comptée parmi les redevables)', async () => {
    await venteAdmin({ type_paiement: 'echellonner', montant_paye: '0' });
    const vente = await Vente.findOne();
    const paiements = await Paiement.findAll({ where: { id_vente: vente.id } });
    expect(paiements.map((p) => p.montant)).toEqual([0]);
  });

  test('montant reçu égal au total : la vente passe en « total »', async () => {
    await venteAdmin({ type_paiement: 'echellonner', montant_paye: '2500' });
    expect((await Vente.findOne()).type_paiement).toBe('total');
  });

  test.each([
    ['montant reçu supérieur au total', { type_paiement: 'echellonner', montant_paye: '3000' }],
    ['montant reçu non saisi', { type_paiement: 'echellonner', montant_paye: '' }],
    ['date dans le futur', { date_vente: ajouterJours(aujourdhui(), 1) }],
    ['vente livrée sans livreur', { type_vente: 'livrer', livreur: '' }],
    ['client manquant', { id_client: '' }],
  ])('refusée : %s', async (_libelle, champs) => {
    await venteAdmin(champs);
    expect(await Vente.count()).toBe(0);
    expect(await Paiement.count()).toBe(0);
    expect(await StockSachetSortie.count()).toBe(0);
  });

  test('vente livrée avec livreur', async () => {
    await venteAdmin({ type_vente: 'livrer', livreur: 'Moussa' });
    expect((await Vente.findOne()).livreur).toBe('Moussa');
  });
});

describe('une vente n\'est jamais modifiée', () => {
  test('envoyer un id (modification) est refusé et la vente reste identique', async () => {
    await venteAdmin({});
    const vente = await Vente.findOne();
    await venteAdmin({ id: vente.id, quantite: 999 });
    await vente.reload();
    expect(vente.quantite).toBe(100);
    expect(await Vente.count()).toBe(1);
  });

  test('pareil côté caissier', async () => {
    await caissier.agent.post('/ventes/createOrUpdateCaissier').type('form')
      .send({ id_client: client.id, type_vente: 'usine', quantite: 10, prix_unitaire: 25, type_paiement: 'total' });
    const vente = await Vente.findOne();
    await caissier.agent.post('/ventes/createOrUpdateCaissier').type('form')
      .send({ id: vente.id, id_client: client.id, type_vente: 'usine', quantite: 999, prix_unitaire: 25, type_paiement: 'total' });
    await vente.reload();
    expect(vente.quantite).toBe(10);
  });

  test('la route de suppression n\'existe plus', async () => {
    await venteAdmin({});
    const vente = await Vente.findOne();
    const res = await admin.agent.delete(`/ventes/delete/${vente.id}`);
    expect(res.status).toBe(404);
    expect(await Vente.count()).toBe(1);
  });
});

describe('vente caissier', () => {
  test('vente du jour payée : paiement encaissé par le caissier, sortie de stock', async () => {
    await caissier.agent.post('/ventes/createOrUpdateCaissier').type('form')
      .send({ id_client: client.id, type_vente: 'usine', quantite: 40, prix_unitaire: 25, type_paiement: 'total' });
    const vente = await Vente.findOne();
    expect(vente.user).toBe(caissier.user.id);
    const paiement = await Paiement.findOne({ where: { id_vente: vente.id } });
    expect([paiement.montant, paiement.id_user]).toEqual([1000, caissier.user.id]);
    expect(await StockSachetSortie.sum('quantite')).toBe(40);
  });

  test('journée clôturée : plus de vente encaissée ce jour-là', async () => {
    await CaisseJournee.create({ id_user: caissier.user.id, date: aujourdhui(), montant_encaisse: 1, id_detenteur: caissier.user.id, montant_detenu: 1 });
    await caissier.agent.post('/ventes/createOrUpdateCaissier').type('form')
      .send({ id_client: client.id, type_vente: 'usine', quantite: 40, prix_unitaire: 25, type_paiement: 'total' });
    expect(await Vente.count()).toBe(0);
  });
});

describe('annulation', () => {
  test('l\'admin annule : vente archivée, paiements retirés, sachets restitués', async () => {
    await venteAdmin({});
    const vente = await Vente.findOne();
    const res = await admin.agent.post(`/ventes/annuler/${vente.id}`).type('form').send({ observation: 'erreur de saisie' });
    expect(res.status).toBe(302);
    expect(await Vente.count()).toBe(0);
    expect(await Paiement.count()).toBe(0);
    const [archivee] = await sequelize.query('SELECT * FROM ventes_annuler WHERE id = ?', { replacements: [vente.id], type: sequelize.QueryTypes.SELECT });
    expect(archivee).toMatchObject({ quantite: 100, observation: 'erreur de saisie', user: admin.user.id });
    expect(await StockSachetEntree.sum('quantite')).toBe(100);
  });

  test('un caissier ne peut pas annuler', async () => {
    await venteAdmin({});
    const vente = await Vente.findOne();
    const res = await caissier.agent.post(`/ventes/annuler/${vente.id}`).type('form').send({});
    expect(res.headers.location).toBe('/dashboard/index');
    expect(await Vente.count()).toBe(1);
  });

  test('la page des ventes annulées liste la vente', async () => {
    await venteAdmin({});
    const vente = await Vente.findOne();
    await admin.agent.post(`/ventes/annuler/${vente.id}`).type('form').send({ observation: 'doublon' });
    const page = await admin.agent.get('/ventes/annulees');
    expect(page.status).toBe(200);
    expect(page.text).toContain('doublon');
  });
});

describe('versements', () => {
  async function venteACredit() {
    await venteAdmin({ type_paiement: 'echellonner', montant_paye: '500' });
    return Vente.findOne();
  }

  test('versement partiel accepté, encaissé par celui qui le saisit', async () => {
    const vente = await venteACredit();
    await caissier.agent.post('/ventes/AjouterVersement').type('form')
      .send({ id_vente: vente.id, montant: 1000, date: aujourdhui(), observation: 'tranche 2' });
    const p = await Paiement.findOne({ where: { observation: 'tranche 2' } });
    expect([p.montant, p.id_user]).toEqual([1000, caissier.user.id]);
  });

  test('versement supérieur au reste refusé', async () => {
    const vente = await venteACredit();
    await admin.agent.post('/ventes/AjouterVersement').type('form')
      .send({ id_vente: vente.id, montant: 2001, date: aujourdhui() });
    expect(await Paiement.sum('montant', { where: { id_vente: vente.id } })).toBe(500);
  });

  test('versement sur une vente déjà payée refusé', async () => {
    await venteAdmin({});
    const vente = await Vente.findOne();
    await admin.agent.post('/ventes/AjouterVersement').type('form')
      .send({ id_vente: vente.id, montant: 100, date: aujourdhui() });
    expect(await Paiement.count({ where: { id_vente: vente.id } })).toBe(1);
  });

  test('versement refusé sur une journée clôturée du caissier', async () => {
    const vente = await venteACredit();
    await CaisseJournee.create({ id_user: caissier.user.id, date: aujourdhui(), montant_encaisse: 1, id_detenteur: caissier.user.id, montant_detenu: 1 });
    await caissier.agent.post('/ventes/AjouterVersement').type('form')
      .send({ id_vente: vente.id, montant: 100, date: aujourdhui() });
    expect(await Paiement.count({ where: { id_vente: vente.id } })).toBe(1);
  });
});
