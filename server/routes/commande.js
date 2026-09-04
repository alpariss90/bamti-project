const express = require('express');
const router = express.Router();
const commandeController = require('../controllers/commandeController');

router.get('/index', commandeController.list);
router.get('/jour', commandeController.jour);
router.post('/createOrUpdate', commandeController.createOrUpdate);
router.post('/delete/:id', commandeController.delete);
router.post('/valider/:id', commandeController.valider);

module.exports = router;
