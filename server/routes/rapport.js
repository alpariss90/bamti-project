const express = require('express');
const router = express.Router();
const rapportController = require('../controllers/rapportController');

router.get('/index', rapportController.index);
router.get('/apercu', rapportController.apercu);
router.post('/envoyer', rapportController.envoyer);

module.exports = router;
