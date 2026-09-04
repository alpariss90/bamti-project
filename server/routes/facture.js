const express = require('express');
const router = express.Router();
const factureController = require('../controllers/factureController');

// GET /facture/proforma
router.get('/proforma', factureController.proformaForm);

// POST /facture/proforma/generate
router.post('/proforma/generate', factureController.proformaGenerate);

module.exports = router;
