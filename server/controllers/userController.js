const db = require('../models');
const User = db.User;
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

//  Fonction de hash de mot de passe
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

//  GET /users/index — Affiche la liste des utilisateurs et le formulaire
exports.list = async (req, res) => {
  try {
    const users = await User.findAll();
    res.render('users/index', {
      users,
      message: req.flash('message')[0] || null,
      pageTitle: 'Liste des utilisateurs'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des utilisateurs :', err);
    req.flash('message', 'Erreur serveur lors du chargement des utilisateurs.');
    res.redirect('/users/index');
  }
};

//  GET /users/index — Changement de mot de passe
exports.changePassword = async (req, res) => {
  try {
    const users = await User.findAll();


    res.render('users/change-pass', {
      users,
      message: req.flash('message')[0] || null,
      pageTitle: 'Changement de mot de passes'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des formufulaire de changement de mot passe :', err);
    req.flash('message', 'Erreur serveur lors du chargement  des formufulaire de changement de mot passe');
    res.redirect('/users/index');
  }
};

//  Fonction utilitaire de redirection avec message
function redirectWithMessage(req, res, msg, path = '/users/index') {
  req.flash('message', msg);
  return res.redirect(path);
}


//  POST /users/createOrUpdate — Crée ou met à jour un utilisateur
exports.createOrUpdate = async (req, res) => {
  const { id, nom, telephone, login, profil } = req.body;

  if (!nom || !login || !profil || !telephone) {
    return redirectWithMessage(req, res, 'Tous les champs obligatoires doivent être remplis.');
  }

  try {
    if (id) {
      const user = await User.findByPk(id);
      if (!user) {
        return redirectWithMessage(req, res, 'Utilisateur non trouvé.');
      }

      await user.update({ nom, telephone, login, profil });
      return redirectWithMessage(req, res, 'Utilisateur mis à jour avec succès.');
    } else {
      const defaultPassword = '1234';
      const hashedPassword = await hashPassword(defaultPassword);

      await User.create({
        nom,
        telephone,
        login,
        password: hashedPassword,
        profil,
        isActive: true,
      });

      return redirectWithMessage(req, res, 'Utilisateur ajouté avec le mot de passe par défaut : "1234".');
    }
  } catch (err) {
    console.error('Erreur lors de la création/mise à jour :', err);
    const msg = err.name === 'SequelizeUniqueConstraintError'
      ? 'Login déjà utilisé.'
      : 'Erreur lors de la création ou modification.';
    return redirectWithMessage(req, res, msg);
  }
};







exports.valideChangePasswordJson = async (req, res) => {
  const { newpass, newpassr } = req.body;

  // Vérification des champs requis
  if (!newpass || !newpassr) {
    const message = "Veuillez remplir les deux champs";
    
    // Si c'est une requête AJAX, retourner JSON
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(400).json({
        success: false,
        message: message
      });
    }
    
    // Sinon, rediriger normalement avec flash message
    req.flash('message', message);
    return res.redirect("/users/change-password");
  }

  // Vérification que les mots de passe correspondent
  if (newpass !== newpassr) {
    const message = "Les deux mots de passe ne sont pas les mêmes";
    
    // Si c'est une requête AJAX, retourner JSON
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(400).json({
        success: false,
        message: message
      });
    }
    
    // Sinon, rediriger normalement avec flash message
    req.flash('message', message);
    return res.redirect("/users/change-password");
  }

  try {
    // Vérification de la longueur du mot de passe
    if (newpass.length < 6) {
      const message = "Le mot de passe doit contenir au moins 6 caractères";
      
      // Si c'est une requête AJAX, retourner JSON
      if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.status(400).json({
          success: false,
          message: message
        });
      }
      
      // Sinon, rediriger normalement avec flash message
      req.flash('message', message);
      return res.redirect("/users/change-password");
    }

    // Récupérer l'utilisateur
    const user = await User.findByPk(req.session.user.id);
    if (!user) {
      const message = "Utilisateur non trouvé";
      
      // Si c'est une requête AJAX, retourner JSON
      if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.status(404).json({
          success: false,
          message: message
        });
      }
      
      // Sinon, rediriger normalement avec flash message
      req.flash('message', message);
      return res.redirect("/users/change-password");
    }

    // Hacher et mettre à jour le mot de passe
    const hashed = await hashPassword(newpass);
    await user.update({ password: hashed });

    console.log('Mot de passe changé avec succès pour l\'utilisateur:', user.id);

    // Succès - Si c'est une requête AJAX, retourner JSON
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(200).json({
        success: true,
        message: "Mot de passe changé avec succès"
      });
    }
    
    // Sinon, rediriger normalement avec flash message
    req.flash('success', 'Mot de passe changé avec succès');
    return res.redirect("/users/change-password");
    
  } catch (err) {
    console.error('Erreur lors du changement de mot de passe:', err);
    
    const errorMessage = 'Erreur lors du changement de mot de passe';
    
    // Si c'est une requête AJAX, retourner JSON
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: err.message
      });
    }
    
    // Sinon, rediriger normalement avec flash message
    req.flash('message', errorMessage + ': ' + err.message);
    return res.redirect("/users/change-password");
  }
};

// Fonction helper pour les redirections (gardée pour compatibilité)
function redirectWithMessage(req, res, message) {
  req.flash('message', message);
  return res.redirect("/users/change-password");
}

//  POST /users/reset-password/:id — Réinitialiser le mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return redirectWithMessage(req, res, 'Utilisateur introuvable.');
    }

    const hashed = await hashPassword('1234');
    await user.update({ password: hashed });

    return redirectWithMessage(req, res, `Mot de passe réinitialisé à "1234" pour ${user.nom}.`);
  } catch (err) {
    console.error('Erreur réinitialisation mot de passe :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la réinitialisation du mot de passe.');
  }
};

// Désactiver un utilisateur
exports.deactivate = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      req.flash('message', 'Utilisateur introuvable.');
      return res.redirect('/users/index');
    }

    await user.update({ isActive: false });
    req.flash('message', `Utilisateur "${user.nom}" désactivé avec succès.`);
    res.redirect('/users/index');
  } catch (err) {
    console.error('Erreur lors de la désactivation :', err);
    req.flash('message', 'Erreur lors de la désactivation de l\'utilisateur.');
    res.redirect('/users/index');
  }
};

// Activer un utilisateur
exports.activate = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      req.flash('message', 'Utilisateur introuvable.');
      return res.redirect('/users/index');
    }

    await user.update({ isActive: true });
    req.flash('message', `Utilisateur "${user.nom}" activé avec succès.`);
    res.redirect('/users/index');
  } catch (err) {
    console.error('Erreur lors de l\'activation :', err);
    req.flash('message', 'Erreur lors de l\'activation de l\'utilisateur.');
    res.redirect('/users/index');
  }
};


