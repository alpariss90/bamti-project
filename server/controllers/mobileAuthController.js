/**
 * Controller d'authentification mobile — JWT
 * Seuls les utilisateurs avec profil 'revendeur' peuvent se connecter via l'app mobile.
 */
const db = require('../models');
const { User, Revendeur } = db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET     || 'bamti_jwt_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function formatMobileUser(user, revendeur) {
  return {
    id: user.id,
    nom: user.nom,
    login: user.login,
    telephone: user.telephone,
    profil: user.profil,
    id_revendeur: revendeur?.id ?? null,
    gain_par_sachet: revendeur?.gain_par_sachet ?? 0,
  };
}

async function getOfflineUsersPayload() {
  const users = await User.findAll({
    where: {
      profil: 'revendeur',
      isActive: true,
    },
    include: [
      {
        model: Revendeur,
        as: 'revendeur',
        required: false,
      },
    ],
    order: [['nom', 'ASC']],
  });

  return users.map((user) => ({
    ...formatMobileUser(user, user.revendeur),
    password_hash: user.password,
    isActive: user.isActive,
  }));
}

function generateToken(user, revendeur) {
  return jwt.sign(
    {
      id:               user.id,
      nom:              user.nom,
      login:            user.login,
      profil:           user.profil,
      id_revendeur:     revendeur?.id     ?? null,
      gain_par_sachet:  revendeur?.gain_par_sachet ?? 0
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/mobile/auth/login
exports.login = async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ success: false, message: 'Login et mot de passe requis.' });
  }
  try {
    const user = await User.findOne({ where: { login } });
    if (!user)         return res.status(401).json({ success: false, message: 'Login ou mot de passe incorrect.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Compte désactivé. Contactez l\'administrateur.' });
  
    
    // Seuls les revendeurs peuvent utiliser l'app mobile
    if (user.profil !== 'revendeur') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux revendeurs.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Login ou mot de passe incorrect.' });

    // Récupérer les infos du revendeur
    const revendeur = await Revendeur.findOne({ where: { id_user: user.id, deletedAt: null } });

    const token = generateToken(user, revendeur);

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      token,
      user: formatMobileUser(user, revendeur),
      offline_users: await getOfflineUsersPayload(),
    });
  } catch (err) {
    console.error('[Mobile Auth] login :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/mobile/auth/offline-users
exports.offlineUsers = async (_req, res) => {
  try {
    const users = await getOfflineUsersPayload();
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    console.error('[Mobile Auth] /offline-users :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/mobile/auth/logout
exports.logout = (_req, res) => {
  return res.status(200).json({ success: true, message: 'Déconnexion réussie.' });
};

// GET /api/mobile/auth/me
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.apiUser.id, {
      attributes: ['id', 'nom', 'login', 'telephone', 'profil', 'isActive']
    });
    if (!user)          return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Compte désactivé.' });

    const revendeur = await Revendeur.findOne({ where: { id_user: user.id, deletedAt: null } });

    return res.status(200).json({ success: true, user: formatMobileUser(user, revendeur) });
  } catch (err) {
    console.error('[Mobile Auth] /me :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
