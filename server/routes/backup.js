const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');

router.post('/create', backupController.create);

router.get('/liste', backupController.liste);

router.get('/download/:filename', backupController.download);

module.exports = router;
