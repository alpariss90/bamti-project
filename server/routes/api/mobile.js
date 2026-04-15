/**
 * Routes API mobile — Données revendeur
 * Toutes protégées par JWT (authJwt middleware)
 */
const express = require('express');
const router  = express.Router();
const authJwt = require('../../middleware/authJwt');
const ctrl    = require('../../controllers/mobileDataController');

// ── Clients ────────────────────────────────────────────────────────────────────
// Liste initiale (sync au démarrage)
router.get('/clients',            authJwt, ctrl.getClients);
router.get('/bootstrap',          authJwt, ctrl.bootstrap);
// Ajouter un client (créé par le revendeur)
router.post('/clients',           authJwt, ctrl.createClient);
// Modifier un client (uniquement si créé par ce revendeur)
router.put('/clients/:id',        authJwt, ctrl.updateClient);
// Supprimer logiquement un client (uniquement si créé par ce revendeur et sans vente)
router.delete('/clients/:id',     authJwt, ctrl.deleteClient);

// ── Redevables (ventes non soldées du revendeur) ───────────────────────────────
router.get('/redevables',         authJwt, ctrl.getRedevables);

// ── Ventes ─────────────────────────────────────────────────────────────────────
// Créer une vente
router.post('/ventes',            authJwt, ctrl.createVente);
// Modifier une vente (même jour seulement)
router.put('/ventes/:id',         authJwt, ctrl.updateVente);
// Supprimer une vente (même jour seulement)
router.delete('/ventes/:id',      authJwt, ctrl.deleteVente);

// ── Paiements ──────────────────────────────────────────────────────────────────
// Ajouter un paiement sur une vente existante
router.post('/paiements',         authJwt, ctrl.createPaiement);

// ── Synchronisation des données offline → serveur ─────────────────────────────
router.post('/sync',              authJwt, ctrl.sync);

// ── Rapports ──────────────────────────────────────────────────────────────────
// Recette du jour
router.get('/recette/jour',       authJwt, ctrl.recetteJour);
// Recette par période
router.get('/recette/periode',    authJwt, ctrl.recettePeriode);

module.exports = router;
