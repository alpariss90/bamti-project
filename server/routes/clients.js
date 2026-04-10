const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/index', clientController.list);
router.post('/createOrUpdate', clientController.createOrUpdate);
router.post('/delete/:id', clientController.delete);

module.exports = router;
