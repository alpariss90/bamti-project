// Outils communs aux tests : base de test vidée, utilisateurs, connexion web et mobile.
const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../../app');
const db = require('../../models');

const { sequelize, User, Client } = db;
const MOT_DE_PASSE = 'secret123';
let compteur = 0;

// Sécurité : on ne vide JAMAIS une autre base que bamti_test
function verifierBaseDeTest() {
  const nom = sequelize.config.database;
  if (nom !== 'bamti_test') {
    throw new Error(`Tests interdits sur la base « ${nom} » : seule bamti_test est autorisée.`);
  }
}

// Vide toutes les tables de bamti_test (à appeler dans beforeEach ou beforeAll)
async function viderBase() {
  verifierBaseDeTest();
  const tables = await sequelize.query(
    "SELECT TABLE_NAME AS nom FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
    { type: sequelize.QueryTypes.SELECT }
  );
  // Même connexion pour toutes les requêtes (FOREIGN_KEY_CHECKS est propre à la connexion)
  await sequelize.transaction(async (t) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
    for (const { nom } of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${nom}\``, { transaction: t });
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
  });
}

async function creerUtilisateur(profil, extra = {}) {
  compteur++;
  return User.create({
    nom: `${profil} test ${compteur}`,
    login: `${profil}_${compteur}_${Date.now()}`,
    password: await bcrypt.hash(MOT_DE_PASSE, 4),
    profil,
    isActive: true,
    ...extra,
  });
}

async function creerClient(extra = {}) {
  compteur++;
  return Client.create({ nom: `Client${compteur}`, prenom: 'Test', telephone: `9000${compteur}${Date.now() % 100000}`, ...extra });
}

// Navigateur connecté (cookie de session conservé) avec un nouvel utilisateur du profil demandé
async function connecterWeb(profil, extra = {}) {
  const user = await creerUtilisateur(profil, extra);
  const agent = request.agent(app);
  const res = await agent.post('/login').type('form').send({ login: user.login, password: MOT_DE_PASSE });
  if (res.status !== 302 || res.headers.location !== '/') {
    throw new Error(`Connexion web impossible pour ${profil} (${res.status} → ${res.headers.location})`);
  }
  return { agent, user };
}

// Jeton de l'application mobile pour un nouveau revendeur
async function connecterMobile(extra = {}) {
  const user = await creerUtilisateur('revendeur', extra);
  const res = await request(app).post('/api/mobile/auth/login').send({ login: user.login, password: MOT_DE_PASSE });
  if (res.status !== 200 || !res.body.token) {
    throw new Error(`Connexion mobile impossible (${res.status} : ${res.body && res.body.message})`);
  }
  return { token: res.body.token, user };
}

// Message flash affiché après une redirection : on suit la redirection et on cherche le texte
async function pageApres(agent, res) {
  if (res.status !== 302) return res;
  return agent.get(res.headers.location);
}

async function fermer() {
  await sequelize.close();
}

module.exports = {
  app, db, request, MOT_DE_PASSE,
  viderBase, creerUtilisateur, creerClient, connecterWeb, connecterMobile, pageApres, fermer,
};
