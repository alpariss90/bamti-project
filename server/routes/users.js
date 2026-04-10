const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// const  isAdmin  = require('../middleware/sessionUser');

//  Page principale : formulaire + liste des utilisateurs
router.get('/index', userController.list);

// Créer ou modifier un utilisateur (formulaire unique)
router.post('/createOrUpdate', userController.createOrUpdate);

//  Désactiver un utilisateur
router.post('/deactivate/:id', userController.deactivate);

// Activer un utilisateur
router.post('/activate/:id', userController.activate);


// Réinitialisation mot de passe
router.post('/reset-password/:id', userController.resetPassword);
// Page de connexion (GET)


// router.get('/change-password', userController.changePassword);

// router.post('/valide-change-password', userController.valideChangePassword);

router.post('/valide-change-password/json', userController.valideChangePasswordJson);



module.exports = router;
