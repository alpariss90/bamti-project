const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/index/:mois/:annee', dashboardController.index);


router.get('/api/daily-data/:year/:month', dashboardController.getDailyData);


module.exports = router;
