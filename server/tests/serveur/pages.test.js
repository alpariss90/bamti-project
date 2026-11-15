// Chaque page de l'application s'ouvre sans erreur pour chaque profil autorisé,
// et renvoie vers le tableau de bord pour un profil non autorisé (config/permissions.js).
const { viderBase, connecterWeb, request, app, db, fermer } = require('../helpers/base');
const PERMISSIONS = require('../../config/permissions');

const maintenant = new Date();

// [adresse, permission du module (app.js)]
const PAGES = [
  ['/', 'accueil'],
  [`/dashboard/index/${maintenant.getMonth() + 1}/${maintenant.getFullYear()}`, 'dashboard'],
  ['/users/index', 'users'],
  // /users/change-password : route désactivée (routes/users.js)
  ['/personnes/index', 'personnes'],
  ['/person/index', 'personnel'],
  ['/commandes/index', 'commandes'],
  ['/commandes/jour', 'commandes'],
  ['/type_depense/index', 'type_depense'],
  ['/depenses/index', 'depenses'],
  ['/depenses/filtre', 'depenses'],
  ['/depenses/non-valide', 'depenses'],
  ['/engin/index', 'engin'],
  ['/profil/index', 'profil'],
  ['/conge/index', 'conge'],
  ['/planification/index', 'planification'],
  ['/planification/liste', 'planification'],
  ['/ventes/index', 'ventes'],
  ['/ventes/filtre', 'ventes'],
  ['/ventes/redevable', 'ventes'],
  ['/ventes/redevable/print', 'ventes'],
  ['/ventes/index/caissier', 'ventes'],
  ['/ventes/annulees', 'ventes'],
  ['/montant_personnel/index', 'montant_personnel'],
  ['/personnel_avance/index', 'personnel_avance'],
  ['/salaire/index', 'salaire'],
  ['/mvt_matieres/index', 'mvt_matieres'],
  ['/mvt_matieres/filtre', 'mvt_matieres'],
  ['/mvt_matieres/non-valide', 'mvt_matieres'],
  ['/materiel/index', 'materiel'],
  ['/materiel/entree', 'materiel'],
  ['/materiel/sortie', 'materiel'],
  ['/materiel/rebut', 'materiel'],
  ['/materiel/statistiques', 'materiel'],
  ['/facture/proforma', 'facture'],
  ['/stock-sachet/index', 'stock_sachet'],
  ['/stock-sachet/statistiques', 'stock_sachet'],
  ['/tickets/index', 'tickets'],
  ['/revendeurs/index', 'revendeurs'],
  ['/revendeurs/recette/jour', 'revendeurs'],
  ['/revendeurs/recette/periode', 'revendeurs'],
  ['/revendeurs/sync', 'revendeurs'],
  ['/mdp/change-password', 'mdp'],
  ['/backup/liste', 'backup'],
  ['/reservations/index', 'reservations'],
  ['/reservations/jour', 'reservations'],
  ['/reservations/non-livrees', 'reservations'],
  ['/reservations/livrees', 'reservations'],
  ['/rapports/index', 'rapports'],
  ['/logs/index', 'logs'],
  ['/caisse/index', 'caisse'],
  ['/caisse/recevoir', 'caisse.recevoir'],
  ['/caisse/suivi', 'caisse'],
];

const PROFILS = ['admin', 'gestionnaire', 'caissier', 'visualisation', 'magasinier', 'revendeur'];

// Toutes les pages web passent d'abord par autorise('accueil') (app.use('/') dans app.js)
const autorise = (profil, permission) =>
  PERMISSIONS.accueil.includes(profil) && PERMISSIONS[permission].includes(profil);

const agents = {};
// Le tableau de bord lit la vue SQL situation_detail_vente : absente de la base locale et de commandes.txt
// (à récupérer depuis la production). Tant qu'elle manque, le test du tableau de bord est signalé et ignoré.
let vueDashboardPresente = true;

beforeAll(async () => {
  await viderBase();
  const [vue] = await db.sequelize.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'situation_detail_vente'",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  vueDashboardPresente = Number(vue.n) > 0;
  if (!vueDashboardPresente) console.warn("Vue situation_detail_vente absente : test du tableau de bord ignoré.");
  for (const profil of PROFILS) {
    // Le revendeur n'a aucune page web : la connexion réussit mais toutes les pages le renvoient
    agents[profil] = (await connecterWeb(profil)).agent;
  }
});

afterAll(fermer);

test('sans connexion : renvoi vers la page de connexion', async () => {
  const res = await request(app).get('/ventes/index');
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/login');
});

describe.each(PROFILS)('profil %s', (profil) => {
  const cas = PAGES.map(([adresse, permission]) => [adresse, permission, autorise(profil, permission)]);

  test.each(cas)('%s (%s) → autorisé : %s', async (adresse, _permission, permis) => {
    const res = await agents[profil].get(adresse);
    if (permis && adresse.startsWith('/dashboard') && !vueDashboardPresente) return;
    if (permis) {
      expect({ adresse, status: res.status, vers: res.headers.location }).toEqual({ adresse, status: 200, vers: undefined });
    } else {
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/dashboard/index');
    }
  });
});
