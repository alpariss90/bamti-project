/**
 * Controller d'authentification pour l'API mobile (JWT)
 * Basé sur la même logique que loginController.js (session EJS)
 * mais retourne du JSON + JWT au lieu d'effectuer des redirections.
 */

const db = require('../models');
const User = db.User;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bamti_jwt_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Génère un JWT pour un utilisateur donné
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      nom: user.nom,
      login: user.login,
      profil: user.profil
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ────────────────────────────────────────────────
// POST /api/mobile/auth/login
// ────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({
      success: false,
      message: 'Veuillez saisir votre login et mot de passe.'
    });
  }

  try {
    const user = await User.findOne({ where: { login } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Login ou mot de passe incorrect.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Veuillez contacter l\'administrateur.'
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Login ou mot de passe incorrect.'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        login: user.login,
        telephone: user.telephone,
        profil: user.profil
      }
    });
  } catch (err) {
    console.error('[Mobile Auth] Erreur login :', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur. Veuillez réessayer.'
    });
  }
};

// ────────────────────────────────────────────────
// POST /api/mobile/auth/logout
// (Côté serveur stateless : le client supprime son token)
// ────────────────────────────────────────────────
exports.logout = (req, res) => {
  // JWT est stateless : la déconnexion se fait côté client (suppression du token)
  // On pourrait tenir une blacklist en base si nécessaire, mais pour simplifier :
  return res.status(200).json({
    success: true,
    message: 'Déconnexion réussie.'
  });
};

// ────────────────────────────────────────────────
// GET /api/mobile/auth/me  (route protégée par authJwt)
// ────────────────────────────────────────────────
exports.me = async (req, res) => {
  try {
    // req.apiUser est injecté par le middleware authJwt
    const user = await User.findByPk(req.apiUser.id, {
      attributes: ['id', 'nom', 'login', 'telephone', 'profil', 'isActive', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        login: user.login,
        telephone: user.telephone,
        profil: user.profil,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('[Mobile Auth] Erreur /me :', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur.'
    });
  }
};
