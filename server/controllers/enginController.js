const db = require('../models');
const Engin = db.Engin;

// =======================
// Fonction utilitaire commune
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/engin/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// =======================
// Liste des engins
// =======================
exports.list = async (req, res) => {
  try {
    const engins = await Engin.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('engin/index', {
      engins,
      enginEdit: null,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des engins'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des engins :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des engins.', 'danger');
  }
};

// =======================
// Créer ou mettre à jour un engin
// =======================
exports.createOrUpdate = async (req, res) => {
  const { id, libelle } = req.body;

  if (!libelle) {
    return redirectWithMessage(req, res, 'Le libellé est obligatoire.', 'danger');
  }

  try {
    if (id) {
      const engin = await Engin.findByPk(id);
      if (!engin) {
        return redirectWithMessage(req, res, 'Engin introuvable.', 'danger');
      }

      await engin.update({ libelle });
      return redirectWithMessage(req, res, 'Engin modifié avec succès.', 'warning');
    } else {
      await Engin.create({ libelle });
      return redirectWithMessage(req, res, 'Engin ajouté avec succès.', 'success');
    }
  } catch (error) {
    console.error('Erreur création/mise à jour engin :', error);

    const msg = error.name === 'SequelizeUniqueConstraintError'
      ? 'Ce libellé existe déjà.'
      : 'Erreur lors de la création ou mise à jour.';
    return redirectWithMessage(req, res, msg, 'danger');
  }
};

// =======================
// Supprimer un engin
// =======================
exports.delete = async (req, res) => {
  const { id } = req.params;
  const deletedBy = req.session?.user?.username || 'admin';

  try {
    const engin = await Engin.findByPk(id);
    if (!engin) {
      return redirectWithMessage(req, res, 'Engin introuvable.', 'danger');
    }

    await engin.update({
      deletedAt: new Date(),
      deletedBy: deletedBy
    });

    return redirectWithMessage(req, res, `Engin "${engin.libelle}" marqué comme supprimé.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'engin :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression de l\'engin.', 'danger');
  }
};

// =======================
// Édition d’un engin (pré-remplissage)
// =======================
exports.edit = async (req, res) => {
  const id = req.params.id;

  try {
    const enginEdit = await Engin.findByPk(id);
    if (!enginEdit) {
      return redirectWithMessage(req, res, 'Engin introuvable.', 'danger');
    }

    const engins = await Engin.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('engin/index', {
      enginEdit,
      engins,
      message: req.flash('message')[0] || null,
      pageTitle: 'Modifier Engin'
    });
  } catch (error) {
    console.error('Erreur lors du chargement de l\'engin :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement de l\'engin.', 'danger');
  }
};
