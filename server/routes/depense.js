const express = require('express');
const router = express.Router();
const depenseController = require('../controllers/depenseController');

router.get('/index', depenseController.list);
router.post('/createOrUpdate', depenseController.createOrUpdate);
router.post('/delete/:id', depenseController.delete);
router.post('/validate/:id', depenseController.validate);
router.get('/filtre', depenseController.depensesFiltrees);
router.get('/non-valide', depenseController.depensesNonValide);

module.exports = router;
