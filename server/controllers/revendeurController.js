const db = require('../models');
const { Revendeur, User, sequelize } = db;
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

function redirectWithMessage(req, res, msg, type = 'success', path = '/revendeurs/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// GET /revendeurs/index — Liste des revendeurs actifs
exports.list = async (req, res) => {
  try {
    const revendeurs = await Revendeur.findAll({
      where: { deletedAt: null },
      include: [{ model: User, as: 'user', attributes: ['id', 'login', 'isActive'] }],
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
    res.render('revendeurs/index', {
      revendeurs,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Revendeurs'
    });
  } catch (err) {
    console.error('Erreur chargement revendeurs :', err);
    return redirectWithMessage(req, res, 'Erreur serveur.', 'danger');
  }
};

// POST /revendeurs/createOrUpdate
exports.createOrUpdate = async (req, res) => {
  const { id, nom, prenom, telephone, adresse, gain_par_sachet } = req.body;

  if (!nom || !prenom || !gain_par_sachet) {
    return redirectWithMessage(req, res, 'Nom, prénom et gain par sachet sont obligatoires.', 'danger');
  }

  const t = await sequelize.transaction();
  try {
    if (id) {
      // ── Modification ──
      const revendeur = await Revendeur.findByPk(id, { transaction: t });
      if (!revendeur) {
        await t.rollback();
        return redirectWithMessage(req, res, 'Revendeur introuvable.', 'danger');
      }
      await revendeur.update({ nom, prenom, telephone, adresse, gain_par_sachet }, { transaction: t });

      // Mise à jour du nom dans le User lié
      if (revendeur.id_user) {
        await User.update({ nom: `${prenom} ${nom}`, telephone }, { where: { id: revendeur.id_user }, transaction: t });
      }

      await t.commit();
      return redirectWithMessage(req, res, 'Revendeur mis à jour avec succès.', 'warning');
    } else {
      // ── Création ──
      // 1) Générer un login unique : initiale prénom + nom en minuscules
      const baseLogin = `${prenom.charAt(0).toLowerCase()}${nom.toLowerCase().replace(/\s+/g, '')}`;
      // Vérifier unicité du login
      const existing = await User.findOne({ where: { login: baseLogin } });
      const login = existing ? `${baseLogin}${Date.now().toString().slice(-4)}` : baseLogin;

      const hashedPassword = await bcrypt.hash('1234', SALT_ROUNDS);

      // 2) Créer le User avec profil 'revendeur'
      const newUser = await User.create({
        nom: `${prenom} ${nom}`,
        telephone,
        login,
        password: hashedPassword,
        profil: 'revendeur',
        isActive: true
      }, { transaction: t });

      // 3) Créer le Revendeur lié
      await Revendeur.create({
        nom, prenom, telephone, adresse, gain_par_sachet,
        id_user: newUser.id
      }, { transaction: t });

      await t.commit();
      return redirectWithMessage(
        req, res,
        `Revendeur créé. Compte: login="${login}", mot de passe par défaut: "1234".`,
        'success'
      );
    }
  } catch (err) {
    await t.rollback();
    console.error('Erreur createOrUpdate revendeur :', err);
    const msg = err.name === 'SequelizeUniqueConstraintError'
      ? 'Ce numéro de téléphone est déjà utilisé.'
      : 'Erreur lors de la création/modification du revendeur.';
    return redirectWithMessage(req, res, msg, 'danger');
  }
};

// GET /revendeurs/detail/:id
exports.detail = async (req, res) => {
  try {
    const revendeur = await Revendeur.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'login', 'isActive'] }]
    });
    if (!revendeur) return redirectWithMessage(req, res, 'Revendeur introuvable.', 'danger');

    res.render('revendeurs/detail', {
      revendeur,
      message: null,
      pageTitle: `Détail : ${revendeur.prenom} ${revendeur.nom}`
    });
  } catch (err) {
    console.error('Erreur détail revendeur :', err);
    return redirectWithMessage(req, res, 'Erreur serveur.', 'danger');
  }
};

// POST /revendeurs/delete/:id — Suppression logique
exports.delete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const revendeur = await Revendeur.findByPk(req.params.id, { transaction: t });
    if (!revendeur) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Revendeur introuvable.', 'danger');
    }

    const deletedBy = req.session?.user?.login || 'admin';

    // Suppression logique du revendeur
    await revendeur.update({ deletedAt: new Date(), deletedBy }, { transaction: t });

    // Désactiver le user lié
    if (revendeur.id_user) {
      await User.update({ isActive: false }, { where: { id: revendeur.id_user }, transaction: t });
    }

    await t.commit();
    return redirectWithMessage(req, res, `Revendeur "${revendeur.prenom} ${revendeur.nom}" supprimé.`, 'success');
  } catch (err) {
    await t.rollback();
    console.error('Erreur suppression revendeur :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression.', 'danger');
  }
};
