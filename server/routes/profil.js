const express = require('express');
const router = express.Router();
const profilController = require('../controllers/profilController');

// GET /profil/index
router.get('/index', profilController.list);

// POST /profil/createOrUpdate
router.post('/createOrUpdate', profilController.createOrUpdate);

// POST /profil/delete/:id
router.post('/delete/:id', profilController.delete);
router.get('/edit/:id', profilController.edit);


module.exports = router;
