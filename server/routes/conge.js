const express = require('express');
const router = express.Router();
const congeController = require('../controllers/congeController');

// GET /conge/index
router.get('/index', congeController.list);

// POST /conge/create
router.post('/create', congeController.create);

// POST /conge/delete/:id
router.post('/delete/:id', congeController.delete);

module.exports = router;
