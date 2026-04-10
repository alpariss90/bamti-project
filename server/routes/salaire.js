const express = require('express');
const router = express.Router();
const salaireController = require('../controllers/salaireController');

// GET : afficher salaires selon période
router.get('/index', salaireController.afficherSalaires);

// POST : valider salaires sélectionnés
router.post('/valider', salaireController.validerSalaires);

router.post('/execute', salaireController.execute);

module.exports = router;
