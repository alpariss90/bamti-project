/**
 * Fonction utilitaire pour rediriger avec message flash
 */
function redirectWithMessage(req, res, msg, type = 'error', path = '/login') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

/**
 * Middleware d'autorisation basé sur le rôle utilisateur
 */
module.exports = function authRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session.user;
  
 /*   const user = {
  id: 1, login: "alpariss", profil: "admin"
 }*/

// req.session.user=user; //a supprimer en deployement 

    //  Laisse passer les routes publiques (login, logout, etc.)
    const publicPaths = ['/login', '/logout', '/register'];
    if (publicPaths.some(p => req.path.startsWith(p))) {
      return next();
    }

    //  Si pas de session utilisateur → redirige vers login
    if (!user) {
      return redirectWithMessage(
        req,
        res,
        'Vous devez être connecté pour accéder à cette page.',
        'danger',
        '/login'
      );
    }

    //  Si le rôle n’est pas autorisé
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.profil)) {
      return redirectWithMessage(
        req,
        res,
        'Accès refusé. Vous n’avez pas les droits nécessaires.',
        'danger',
        '/dashboard/index'
      );
    }

    //  Sinon, autorisé
    next();
  };
};
