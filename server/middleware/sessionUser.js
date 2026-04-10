module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
  } else {
    res.locals.currentUser = null;
  }
/* res.locals.currentUser={
  id: 1, login: "alpariss", profil: "admin"
 }*/
  next();
};
// isAdmin.js
// module.exports = (req, res, next) => {
//   if (req.user.profil !== 'admin') {
//     return res.status(403).json({ message: 'Only super admin can perform this action' });
//   }
//   next();
// };

