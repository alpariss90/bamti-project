const express = require('express');
const router = express.Router();
const mvtMatiereController = require('../controllers/mvtMatiereController');

//  Liste des mouvements
router.get('/index', mvtMatiereController.list);

//  Création ou mise à jour
router.post('/createOrUpdate', mvtMatiereController.createOrUpdate);

//  Validation d’un mouvement
router.post('/validate/:id', mvtMatiereController.validate);

//  Suppression physique
router.get('/delete/:id', mvtMatiereController.delete);
router.get('/filtre', mvtMatiereController.mvtMatieresFiltrees);

router.get('/non-valide', mvtMatiereController.matiereNonValide);

module.exports = router;
