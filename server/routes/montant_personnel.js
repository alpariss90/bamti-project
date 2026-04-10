const express = require('express');
const router = express.Router();
const montantPersonnelController = require('../controllers/montantPersonnelController');

router.get('/index', montantPersonnelController.list);
router.post('/updateSalaire', montantPersonnelController.updateSalaire);

module.exports = router;
