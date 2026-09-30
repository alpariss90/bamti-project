const PERMISSIONS = require('../config/permissions');

// Vrai si le profil possède la permission (voir config/permissions.js)
function aLaPermission(profil, permission) {
  const profils = PERMISSIONS[permission];
  if (!profils) {
    console.warn(`[Permissions] Permission inconnue : "${permission}"`);
    return false;
  }
  return profils.includes(profil);
}

// Vrai si l'utilisateur connecté (session web) possède la permission
function peut(req, permission) {
  const user = req.session && req.session.user;
  return !!user && aLaPermission(user.profil, permission);
}

function redirectWithMessage(req, res, msg, type, path) {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Middleware de route : autorise('depenses'), autorise('depenses.valider')…
function autorise(permission) {
  return (req, res, next) => {
    // Routes publiques (login, logout…)
    const publicPaths = ['/login', '/logout', '/register'];
    if (publicPaths.some(p => req.path.startsWith(p))) {
      return next();
    }

    if (!req.session || !req.session.user) {
      return redirectWithMessage(req, res, 'Vous devez être connecté pour accéder à cette page.', 'danger', '/login');
    }

    if (!peut(req, permission)) {
      return redirectWithMessage(req, res, 'Accès refusé. Vous n’avez pas les droits nécessaires.', 'danger', '/dashboard/index');
    }

    next();
  };
}

module.exports = { autorise, peut, aLaPermission };
