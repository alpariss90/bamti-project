// Stock d'eau : production, sortie à la vente, restitution à l'annulation, affichage dans le menu,
// et règles du futur stock réel (services/stockEau.js, script scripts/testStockEau.js).
const { execFileSync } = require('child_process');
const path = require('path');
const { viderBase, connecterWeb, creerClient, db, fermer } = require('../helpers/base');
const { aujourdhui } = require('../../services/rapport/periode');
const { calculerStock } = require('../../controllers/stockSachetController');

const { Vente, StockSachetEntree } = db;

let admin;
let client;

beforeEach(async () => {
  await viderBase();
  admin = await connecterWeb('admin');
  client = await creerClient();
});

afterAll(fermer);

const produire = (quantite) => admin.agent.post('/stock-sachet/create').type('form')
  .send({ quantite, date_production: aujourdhui(), observation: 'test' });

test('production enregistrée : le stock augmente', async () => {
  await produire(1000);
  expect(await calculerStock()).toBe(1000);
});

test.each([['0'], ['-5'], ['']])('production refusée : quantité « %s »', async (quantite) => {
  await produire(quantite);
  expect(await StockSachetEntree.count()).toBe(0);
});

test('vente puis annulation : le stock baisse puis revient', async () => {
  await produire(1000);
  await admin.agent.post('/ventes/createOrUpdate').type('form').send({
    id_client: client.id, type_vente: 'usine', quantite: 300, prix_unitaire: 25, type_paiement: 'total', date_vente: aujourdhui(),
  });
  expect(await calculerStock()).toBe(700);
  const vente = await Vente.findOne();
  await admin.agent.post(`/ventes/annuler/${vente.id}`).type('form').send({ observation: 'test' });
  expect(await calculerStock()).toBe(1000);
});

test('le menu affiche le stock d\'eau', async () => {
  await produire(1234);
  const page = await admin.agent.get('/stock-sachet/index');
  expect(page.text).toMatch(/Stock d.eau : 1[\s\u00a0\u202f]234 sachets/);
});

test('règles du stock réel (scripts/testStockEau.js) : 0 échec', () => {
  const sortie = execFileSync(process.execPath, [path.join(__dirname, '../../scripts/testStockEau.js')], {
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
  });
  expect(sortie).toMatch(/ 0 échec\(s\)/);
});
