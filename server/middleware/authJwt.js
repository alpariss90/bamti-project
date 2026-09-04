/**
 * Middleware d'authentification JWT pour les routes API mobiles
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bamti_jwt_secret_key_2024';

/**
 * Vérifie le token JWT dans l'en-tête Authorization (Bearer <token>)
 * et injecte req.apiUser si le token est valide.
 */
module.exports = function authJwt(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant. Veuillez vous connecter.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.apiUser = decoded; // { id, nom, login, profil, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expirée. Veuillez vous reconnecter.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalide. Veuillez vous reconnecter.'
    });
  }
};
