const express = require('express');
const router = express.Router();
const typeDepenseController = require('../controllers/typeDepenseController');

// GET /type_depense/index
router.get('/index', typeDepenseController.list);

// POST /type_depense/createOrUpdate
router.post('/createOrUpdate', typeDepenseController.createOrUpdate);

// POST /type_depense/delete/:id
router.post('/delete/:id', typeDepenseController.delete);

// GET /type_depense/edit/:id
router.get('/edit/:id', typeDepenseController.edit);

module.exports = router;
