const express = require('express');
const router = express.Router();
const planificationController = require('../controllers/planificationController');

// GET /planification/index
router.get('/index', planificationController.formIndex);

// POST /planification/create
router.post('/create', planificationController.create);

// GET /planification/liste
router.get('/liste', planificationController.liste);

// POST /planification/valider/:id
router.post('/valider/:id', planificationController.valider);

// POST /planification/delete/:id
router.post('/delete/:id', planificationController.delete);

module.exports = router;
