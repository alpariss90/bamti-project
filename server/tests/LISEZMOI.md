# Tests automatiques BAMTI

À lancer **après chaque ajout ou modification**, avant de déployer : si un test échoue, quelque chose a été cassé.

## Lancer les tests

| Projet | Commande (depuis le dossier) | Durée |
|---|---|---|
| Serveur (`server/`) | `npm test` | ~1 min 30 |
| Application revendeur (`revendeur/`) | `npm test` | ~10 s |

Résultat attendu : `Tests: N passed` sans aucun `failed`.
Un seul fichier : `npx jest tests/serveur/ventes.test.js` (serveur) ou `npx vitest run tests/unit/dataStore.spec.ts` (app).

## Base de test

Le serveur teste sur **`bamti_test`**, jamais sur `bamti_gestion` ni en production :
- `config/db.js` choisit `bamti_test` quand `NODE_ENV=test` (mis automatiquement par `tests/setup/env.js`) ;
- `tests/helpers/base.js` refuse de vider une autre base que `bamti_test`.

Chaque fichier de test **vide** `bamti_test` avant de travailler. Création et mise à jour de la structure :
section « Base de test bamti_test » à la fin de `commandes.txt`.
**À chaque nouveau SQL (ALTER / CREATE) ajouté dans commandes.txt, l'exécuter aussi sur bamti_test.**

## Ce qui est couvert

| Fichier | Contenu |
|---|---|
| `tests/serveur/pages.test.js` | Chaque page web s'ouvre (200) pour chaque profil autorisé, et renvoie vers le tableau de bord sinon (droits de `config/permissions.js`) |
| `tests/serveur/ventes.test.js` | Création (total, échelonnée, livrée), refus, interdiction de modifier / supprimer, annulation, versements, journée clôturée |
| `tests/serveur/caisse.test.js` | Clôture, remise, réception, refus, annulation, droits |
| `tests/serveur/stock.test.js` | Production, sortie à la vente, restitution à l'annulation, menu « Stock d'eau », règles du stock réel (`scripts/testStockEau.js`) |
| `tests/serveur/mobile-auth.test.js` | Connexion de l'app revendeur, jeton, routes protégées |
| `tests/serveur/revendeur-sync.test.js` | Envoi par uuid, anti-doublon, rechargement, validation admin, versement tardif |
| `revendeur/tests/unit/dataStore.spec.ts` | Saisie hors ligne, file d'attente, envoi, rechargement sans doublon, migration |

À venir (priorité 2 puis 3) : commandes, réservations, tickets, revendeurs, personnel / salaires, dépenses, matériel, rapports.

## Écrire un test

Copier un fichier existant. Outils dans `tests/helpers/base.js` :
`viderBase()`, `connecterWeb('caissier')` → `{ agent, user }` (navigateur connecté), `connecterMobile()` → `{ token, user }`,
`creerClient()`, `creerUtilisateur(profil)`. Vérifier l'état de la base (modèles Sequelize) plutôt que le texte des pages.
