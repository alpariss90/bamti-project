const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');

// GET /personnels
router.get('/index', personnelController.list);

// POST /personnels/createOrUpdate
router.post('/createOrUpdate', personnelController.createOrUpdate);

// POST /personnels/delete/:id
router.post('/delete/:id', personnelController.delete);

// POST /personnels/activate/:id
router.post('/activate/:id', personnelController.activate);

// POST /personnels/deactivate/:id
router.post('/deactivate/:id', personnelController.deactivate);

// POST /personnels/finService/:id
router.post('/finService/:id', personnelController.finService);

// POST /personnels/repriseService/:id
router.post('/repriseService/:id', personnelController.repriseService);

module.exports = router;
