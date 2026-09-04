const express = require('express');
const router = express.Router();
const stockSachetController = require('../controllers/stockSachetController');

// GET /stock-sachet/index
router.get('/index', stockSachetController.form);

// POST /stock-sachet/create
router.post('/create', stockSachetController.create);

// GET /stock-sachet/statistiques
router.get('/statistiques', stockSachetController.statistiques);

module.exports = router;
