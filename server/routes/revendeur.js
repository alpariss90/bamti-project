const express = require('express');
const router = express.Router();
const revendeurController = require('../controllers/revendeurController');
const recetteController   = require('../controllers/revendeurRecetteController');
const syncController      = require('../controllers/syncRevendeurController');

// Liste
router.get('/index', revendeurController.list);

// Créer ou modifier
router.post('/createOrUpdate', revendeurController.createOrUpdate);

// Détail
router.get('/detail/:id', revendeurController.detail);

// Suppression logique
router.post('/delete/:id', revendeurController.delete);

// Recette du jour (admin)
router.get('/recette/jour',     recetteController.recetteJour);

// Recette par période (admin)
router.get('/recette/periode',  recetteController.recettePeriode);

// Synchronisation données tmp → tables principales
router.get('/sync',  syncController.showForm);
router.post('/sync', syncController.syncData);

module.exports = router;
