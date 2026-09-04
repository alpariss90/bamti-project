const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reservationController');

router.get('/index',        ctrl.index);
router.post('/create',      ctrl.create);
router.post('/livrer/:id',  ctrl.livrer);
router.get('/jour',         ctrl.jour);
router.get('/non-livrees',  ctrl.nonLivrees);
router.get('/livrees',      ctrl.livrees);

module.exports = router;
