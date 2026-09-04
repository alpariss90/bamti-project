const express = require('express');
const router = express.Router();
const materielController = require('../controllers/materielController');

// Catalogue
router.get('/index', materielController.list);
router.post('/createOrUpdate', materielController.createOrUpdate);
router.get('/edit/:id', materielController.edit);

// Entrée
router.get('/entree', materielController.entreeForm);
router.post('/entree/create', materielController.entreeCreate);

// Sortie
router.get('/sortie', materielController.sortieForm);
router.post('/sortie/create', materielController.sortieCreate);

// Rebut
router.get('/rebut', materielController.rebutForm);
router.post('/rebut/create', materielController.rebutCreate);

// Statistiques
router.get('/statistiques', materielController.statistiques);

module.exports = router;
