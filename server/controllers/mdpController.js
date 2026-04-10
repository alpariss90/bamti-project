const db = require('../models');
const User = db.User;
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

//  Fonction de hash de mot de passe
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

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



//  POST /users/createOrUpdate — Crée ou met à jour un utilisateur
exports.valideChangePassword = async (req, res) => {
  const { newpass, newpassr } = req.body;


  if (!newpass || !newpassr ) {
      req.flash('message', "Veuillez remplir les deux champs");
    return res.redirect("/mdp/change-password");
  }

   if (newpass!=newpassr ) {
      req.flash('message', "Les deux mot de passe ne sont pas les mêmes");
    return res.redirect("/mdp/change-password");
  }

  try {
 
      const user = await User.findByPk(req.session.user.id);
      if (!user) {
        return res.redirect('/mdp/change-password');
      }

       const hashed = await hashPassword(newpass);
        await user.update({ password: hashed });
console.log('---------------------------------------------------------------------------');


      return res.redirect('/mdp/change-password');
    
  } catch (err) {
    console.error('Erreur lors de changement de mot de passe:', err);
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    
    return res.redirect('/mdp/change-password');
  }
};