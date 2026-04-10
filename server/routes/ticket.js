const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.get('/index', ticketController.list);
router.post('/createOrUpdate', ticketController.createOrUpdate);
router.post('/delete/:id', ticketController.delete);
router.post('/livre/:id', ticketController.livrer);
router.post('/vente/:id', ticketController.vente);

module.exports = router;
