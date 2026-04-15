/**
 * Routes API mobiles — Authentification JWT
 * Préfixe : /api/mobile/auth
 */

const express = require('express');
const router = express.Router();
const mobileAuthController = require('../../controllers/mobileAuthController');
const authJwt = require('../../middleware/authJwt');

// POST /api/mobile/auth/login  — Connexion (public)
router.post('/login', mobileAuthController.login);

// POST /api/mobile/auth/logout — Déconnexion (protégée)
router.post('/logout', authJwt, mobileAuthController.logout);

// GET  /api/mobile/auth/me     — Profil courant (protégée)
router.get('/me', authJwt, mobileAuthController.me);

// GET /api/mobile/auth/offline-users — Utilisateurs revendeurs pour cache local
router.get('/offline-users', authJwt, mobileAuthController.offlineUsers);

module.exports = router;
