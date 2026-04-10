const express = require('express');
const router = express.Router();
const personnelAvanceController = require('../controllers/personnelAvanceController');

// Afficher la liste des avances
router.get('/index', personnelAvanceController.list);

// Créer une avance (POST depuis formulaire)
router.post('/create', personnelAvanceController.create);

module.exports = router;
