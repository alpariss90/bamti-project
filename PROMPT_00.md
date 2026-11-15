# PROMPT 00 — Reprise du contexte BAMTI

> À coller en début de nouvelle session Claude Code (dans le dossier `bamti`).
> Dernière mise à jour : 2026-10-31.

---

Bonjour. Tu reprends le projet **BAMTI** avec moi. Voici le contexte complet pour reprendre exactement là où on s'était arrêtés.

## 1. Qui je suis et comment on travaille

- Je suis le développeur du projet BAMTI (usine d'eau en sachets, Niger). Je parle français, réponds-moi en français.
- **Quand je pose une question ou dis « explique-moi d'abord », tu expliques sans coder.** Tu ne codes qu'après mon feu vert (« GO », « vas-y », etc.).
- Tu vérifies toujours dans le code avant d'affirmer quelque chose (ex. : « vérifie si c'est appelé dans les views »).
- Tu respectes le style du code existant (commentaires en français, même idiomes).
- Ne commit pas sans que je le demande. Branche de travail : `claude`.
- Mon client est le **patron de BAMTI**, il n'est pas technicien : tout document pour lui doit être sans jargon.

## 2. Structure du projet

- `server/` : application Node.js / Express / Sequelize (MySQL) / vues EJS + Bootstrap 5. Lancer les commandes depuis `server/`.
  - `controllers/`, `routes/`, `models/`, `views/`, `services/`, `middleware/`, `config/` (menu.js, permissions.js, constantes.js).
  - `commandes.txt` : scripts SQL des évolutions de base (on y ajoute les `CREATE TABLE`).
  - `routes/api/mobile.js` + `controllers/mobileDataController.js` : API JWT pour l'app mobile.
- `revendeur/` : application mobile **Ionic + Vue + Capacitor** (revendeurs) — sert de modèle pour la future app de scan.
- Profils utilisateurs (`models/user.js`) : admin, visualisation, caissier, magasinier, revendeur, gestionnaire.

## 3. Règles métier déjà validées

- **Une vente n'est jamais modifiée ni supprimée, seulement annulée** (l'annulation restitue le stock). Les routes de modification/suppression (web et mobile) ont été commentées.
- Module caisse / clôture de journée : voir `services/caisse.js` (`verifierJourneeNonCloturee`).
- Stock d'eau actuel = Σ production (`stock_sachet_entrees`) − Σ sorties (`stock_sachet_sorties`), calculé dans `controllers/stockSachetController.js` et affiché dans le menu gauche (« Stock d'eau : X sachets »).
- **Bug connu** : les réservations (`controllers/reservationController.js`) ne créent aucune sortie de stock.

## 4. Travaux faits dans la dernière session (2026-10-31)

- `/montant_personnel` : séparateur de milliers à la saisie du salaire (FCFA, pas de décimales).
- `/person` : bouton « Liste complète » → modal avec cases à cocher + impression (sans colonne État à l'impression).
- `/ventes/filtre` : select caissier limité aux profils admin, caissier, gestionnaire.
- `/tickets/index` : bouton « Historique » → modal des tickets en VENTE EFFECTUEE avec recherche.
- Menu gauche : « Stock sachets » renommé « Stock d'eau ».
- Routes de modification/suppression de vente commentées (web `routes/vente.js`, `venteController.js` ; mobile `routes/api/mobile.js`, `mobileDataController.js`).

## 5. Grand projet en cours : stock d'eau réel

**Problème** : le stock baisse à la vente, pas à la sortie physique (achats non retirés, livraisons partielles, retours chauffeurs, famille, pertes) → stock faux.

**Solution validée** : séparer la vente (argent) de l'enlèvement (physique).

- Chaque source (vente usine, commande/tournée, réservation, ticket, carte) crée un **bon d'enlèvement** avec **QR code** (code opaque aléatoire, imprimé aussi en clair). Enlèvement partiel possible, bon soldé refusé, bon annulé si vente annulée.
- **Stock physique** = production − enlèvements + retours − pertes ± ajustements d'inventaire. **Stock engagé** = reste à enlever des bons ouverts. **Stock disponible** = physique − engagé.
- **Tournées** (`/commandes/jour`, réservations) : 1 QR par tournée ; scan au départ (enlève tout) ; scan au retour avec **quantité ramenée par ligne** → retour en stock, le bon du client reste ouvert.
- **Tickets** : QR sur l'impression après livraison.
- **App mobile de scan** (Ionic + Vue, comme `revendeur`) réservée aux profils **gestionnaire** et **magasinier** ; mode hors ligne (délai 4–5 s, file locale, uuid par opération anti-doublon, cache des bons ouverts, statuts « Envoyé / Sur le téléphone / Anomalie », compteur, déconnexion bloquée si opérations en attente, conflits acceptés et marqués en anomalie).
- **Cartes à code-barres** (Code 128, numéro **uniquement en chiffres**), une par personne :
  - **Famille** : dotation gratuite, **tableau de statistiques par personne**, et (demande du patron) **plafonds facultatifs par membre : par jour, par mois, par année** ; plafond atteint = **carte verrouillée** à la caisse (champs `plafond_jour`, `plafond_mois`, `plafond_annee` sur `membres_famille`).
  - **Client prépayé** : **solde en sachets** (prix figé à l'achat) ; retrait à la caisse → bon QR → usine.
  - **Liaison** : écran web où l'on choisit un membre de la famille (créé si besoin, table `membres_famille`) ou un client existant, puis on lit la carte pour la lier.
  - Carte perdue : désactivation + nouvelle carte + transfert du solde.
- **Lecteur code-barres AQ-2210** (USB, seulement claviers USA / Turkey Q) : laissé sur USA ; le champ de scan **convertit `&é"'(-è_çà` → `1234567890`** (PC en AZERTY).
- Bons jamais retirés : on ne fait rien, ils restent visibles (stock engagé, liste des bons non soldés).
- Mise en service : inventaire initial, date de bascule, règle « aucun sachet ne sort sans scan », inventaire hebdomadaire au début. Un réglage par source permet de basculer progressivement.

**Documents (Claude Docs)** :
- Conception technique : https://claude.ai/artifact/G5nB9cqKmcvNJaPwLcXfz2
- Version simple pour le patron : https://claude.ai/artifact/XFkdK7GgKL5MQY2DZCpBBs

## 6. Plan de réalisation

- **Étape 0 — Préparation (FAITE le 2026-10-31)** : tables `bons_enlevement`, `mouvements_stock`, `inventaires` (fin de `commandes.txt`) ; modèles `BonEnlevement`, `MouvementStock`, `Inventaire` ; service `services/stockEau.js` (codes de bon à 10 chiffres + conversion AZERTY, `creerBon`, `trouverBon`, `annulerBon`, `enlever`, `retourner`, `enregistrerPerte`, `enregistrerInventaire`, `calculerStocks`) ; permissions `stock.scanner` (gestionnaire, magasinier), `stock.inventaire` et `stock.perte` (admin, gestionnaire) ; test `node scripts/testStockEau.js` (transaction annulée). **Pas de réglage par source** : tout sera déployé à la fin.
- **Étape 1 — Serveur, bons et stock réel (web)** : bon créé à la vente usine (annulation → bon annulé) ; QR sur le reçu caissier ; écran web « Retrait » (secours + tests) ; correction réservations ; page Stock d'eau (3 chiffres) ; liste des bons non soldés ; pertes ; inventaire.
- **Étape 2 — App mobile de scan** : routes API (connexion, lecture bon, enlèvement/retour avec uuid, bons ouverts, sync) ; projet Ionic + Vue ; écrans ; hors ligne ; page web Anomalies ; bascule vente usine.
- **Étape 3 — Tournées, réservations, tickets** : bon à la validation de commande ; tournée + QR sur `/commandes/jour` et réservations ; écrans Tournée départ / retour ; rechargement d'un bon ouvert ; QR tickets ; activation des sources.
- **Étape 4 — Cartes** : tables `membres_famille`, `cartes`, `carte_mouvements` ; gestion membres ; écran « Lier une carte » ; impression cartes ; lecture à la caisse avec conversion AZERTY ; carte famille + statistiques ; prépayé (achat → crédit, retrait → débit + bon) ; relevé ; carte perdue.

**Décisions encore ouvertes** : plafond famille atteint → déblocage exceptionnel par l'admin ? ; qui saisit pertes/inventaire (admin + gestionnaire par défaut) ; date de bascule et inventaire initial ; recensement des achats payés non retirés à la bascule ; qui traite les anomalies ; PIN/limite pour gros soldes prépayés ; internet à l'usine.

## 7. Où on en est

L'**Étape 0 est terminée et testée** (2026-10-31) :
- Les 3 tables (`bons_enlevement`, `mouvements_stock`, `inventaires`) sont créées dans la base locale `bamti_gestion`.
- `node scripts/testStockEau.js` (depuis `server/`) : **31 vérifications réussies, 0 échec** ; le test travaille dans une transaction annulée, les tables restent vides.
- Le stock calculé de la base locale est à **−632** (données de développement) : normal, l'inventaire initial de la bascule fixera le vrai chiffre. Un test d'inventaire doit donc toujours compter un nombre positif.
- L'ancien système n'est pas touché : les ventes retirent encore le stock comme avant, le menu « Stock d'eau » utilise encore l'ancien calcul.

Prochaine action : **Étape 1**, en commençant par la fonctionnalité 1 (bon créé à la vente usine). **Après chaque étape, tu m'expliques comment tester ses fonctionnalités.**

**Avant de répondre** : lis ta mémoire du projet, fais un `git status` / `git log -5`, et vérifie l'état du code (ex. : existence de `services/stockEau.js`, des tables dans `commandes.txt`) pour savoir si des étapes ont avancé depuis ce prompt. Puis résume-moi en quelques lignes où on en est et propose la prochaine action — sans coder avant mon feu vert.
