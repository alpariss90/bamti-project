const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Afficher la page de login
router.get('/', loginController.showLoginPage);

// Traitement du login
router.post('/', loginController.login);

// Déconnexion
router.get('/logout', loginController.logout);

module.exports = router;
