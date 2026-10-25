const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/caisseController');
const { autorise } = require('../middleware/autorise');

// Clôture de caisse (accès au module : autorise('caisse') dans app.js)
router.get('/index',                 ctrl.index);
router.post('/cloturer',             autorise('caisse.cloturer'), ctrl.cloturer);
router.post('/remettre',             autorise('caisse.cloturer'), ctrl.remettre);
router.post('/remises/:id/annuler',  autorise('caisse.cloturer'), ctrl.annuler);
router.get('/recevoir',              autorise('caisse.recevoir'), ctrl.recevoir);
router.post('/remises/:id/accepter', autorise('caisse.recevoir'), ctrl.accepter);
router.post('/remises/:id/refuser',  autorise('caisse.recevoir'), ctrl.refuser);
router.get('/suivi',                 ctrl.suivi);

module.exports = router;
