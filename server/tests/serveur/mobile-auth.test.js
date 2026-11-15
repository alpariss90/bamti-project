// Application revendeur : connexion par jeton (JWT) et protection des routes /api/mobile.
const { viderBase, creerUtilisateur, connecterMobile, request, app, MOT_DE_PASSE, fermer } = require('../helpers/base');

beforeEach(viderBase);
afterAll(fermer);

const connexion = (login, password = MOT_DE_PASSE) => request(app).post('/api/mobile/auth/login').send({ login, password });

test('un revendeur se connecte et reçoit un jeton', async () => {
  const user = await creerUtilisateur('revendeur');
  const res = await connexion(user.login);
  expect(res.status).toBe(200);
  expect(res.body.token).toBeTruthy();
});

test.each([
  ['mauvais mot de passe', 'revendeur', {}, 'faux', 401],
  ['compte désactivé', 'revendeur', { isActive: false }, MOT_DE_PASSE, 403],
  ['profil caissier (réservé aux revendeurs)', 'caissier', {}, MOT_DE_PASSE, 403],
])('connexion refusée : %s', async (_libelle, profil, extra, password, status) => {
  const user = await creerUtilisateur(profil, extra);
  const res = await connexion(user.login, password);
  expect(res.status).toBe(status);
  expect(res.body.token).toBeUndefined();
});

test.each([
  ['get', '/api/mobile/restore'],
  ['post', '/api/mobile/sync'],
  ['get', '/api/mobile/clients'],
])('%s %s sans jeton : 401', async (methode, adresse) => {
  const res = await request(app)[methode](adresse);
  expect(res.status).toBe(401);
});

test('jeton invalide : 401', async () => {
  const res = await request(app).get('/api/mobile/restore').set('Authorization', 'Bearer faux');
  expect(res.status).toBe(401);
});

test('modifier ou supprimer une vente depuis le mobile est impossible (route absente)', async () => {
  const { token } = await connecterMobile();
  // Route inexistante : Express passe aux pages web, qui renvoient vers /login (jamais un succès JSON)
  const modif = await request(app).put('/api/mobile/ventes/1').set('Authorization', `Bearer ${token}`).send({ quantite: 999 });
  const suppr = await request(app).delete('/api/mobile/ventes/1').set('Authorization', `Bearer ${token}`);
  for (const res of [modif, suppr]) {
    expect([302, 404]).toContain(res.status);
    expect(res.body && res.body.success).not.toBe(true);
  }
});

test('un revendeur n\'a accès à aucune page web', async () => {
  const user = await creerUtilisateur('revendeur');
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ login: user.login, password: MOT_DE_PASSE });
  expect((await agent.get('/ventes/index')).headers.location).toBe('/dashboard/index');
});
