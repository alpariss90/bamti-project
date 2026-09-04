const db = require('../models');
const User = db.User;
const bcrypt = require('bcrypt');

// Fonction utilitaire de redirection avec message
function redirectWithMessage(req, res, msg, type = 'danger', path = '/login') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Affiche la page de login
exports.showLoginPage = (req, res) => {
  res.render('login/index', { message: req.flash('message')[0] || null , pageTitle: 'Connexion' });
};

// POST /login — Authentification utilisateur
exports.login = async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return redirectWithMessage(req, res, 'Veuillez saisir votre login et mot de passe.');
  }

  try {
    const user = await User.findOne({ where: { login } });

    if (!user) {
      return redirectWithMessage(req, res, 'Login ou mot de passe incorrect.');
    }

    if (!user.isActive) {
      return redirectWithMessage(req, res, 'Compte désactivé. Veuillez contacter l’administrateur.');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return redirectWithMessage(req, res, 'Login ou mot de passe incorrect.');
    }

    // Authentification réussie : stockage dans la session
    req.session.user = {
      id: user.id,
      nom: user.nom,
      login: user.login,
      profil: user.profil
    };

    if (user.profil === 'admin') {
      req.session.showStockAlert = true;
    }

    return res.redirect('/');
  } catch (err) {
    console.error('Erreur lors de la connexion :', err);
    return redirectWithMessage(req, res, 'Erreur serveur lors de la tentative de connexion.');
  }
};

// Déconnexion
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Erreur déconnexion :', err);
    res.redirect('/login');
  });
};
