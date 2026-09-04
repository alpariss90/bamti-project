const db = require('../models');
const Profil = db.Profil;

// =======================
// Fonction utilitaire commune
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/profil/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// =======================
// Liste des profils
// =======================
exports.list = async (req, res) => {
  try {
    const profils = await Profil.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('profil/index', {
      profils,
      profilEdit: null,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des profils'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des profils :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des profils.', 'danger');
  }
};

// =======================
// Créer ou mettre à jour un profil
// =======================
exports.createOrUpdate = async (req, res) => {
  const { id, libelle } = req.body;

  if (!libelle) {
    return redirectWithMessage(req, res, 'Le libellé est obligatoire.', 'danger');
  }

  try {
    if (id) {
      const profil = await Profil.findByPk(id);
      if (!profil) {
        return redirectWithMessage(req, res, 'Profil introuvable.', 'danger');
      }

      await profil.update({ libelle });
      return redirectWithMessage(req, res, 'Profil modifié avec succès.', 'warning');
    } else {
      await Profil.create({ libelle });
      return redirectWithMessage(req, res, 'Profil ajouté avec succès.', 'success');
    }
  } catch (error) {
    console.error('Erreur création/mise à jour profil :', error);

    const msg = error.name === 'SequelizeUniqueConstraintError'
      ? 'Ce libellé existe déjà.'
      : 'Erreur lors de la création ou mise à jour.';
    return redirectWithMessage(req, res, msg, 'danger');
  }
};

// =======================
// Supprimer un profil
// =======================
exports.delete = async (req, res) => {
  const { id } = req.params;
  const deletedBy = req.session?.user?.username || 'admin';

  try {
    const profil = await Profil.findByPk(id);
    if (!profil) {
      return redirectWithMessage(req, res, 'Profil introuvable.', 'danger');
    }

    await profil.update({
      deletedAt: new Date(),
      deletedBy: deletedBy
    });

    return redirectWithMessage(req, res, `Profil "${profil.libelle}" marqué comme supprimé.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression du profil :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression du profil.', 'danger');
  }
};

// =======================
// Édition d'un profil (pré-remplissage)
// =======================
exports.edit = async (req, res) => {
  const id = req.params.id;

  try {
    const profilEdit = await Profil.findByPk(id);
    if (!profilEdit) {
      return redirectWithMessage(req, res, 'Profil introuvable.', 'danger');
    }

    const profils = await Profil.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('profil/index', {
      profilEdit,
      profils,
      message: req.flash('message')[0] || null,
      pageTitle: 'Modifier Profil'
    });
  } catch (error) {
    console.error('Erreur lors du chargement du profil :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement du profil.', 'danger');
  }
};
