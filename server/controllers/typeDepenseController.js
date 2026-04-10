const db = require('../models');
const TypeDepense = db.TypeDepense;

// =======================
// Fonction utilitaire pour rediriger avec message
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/type_depense/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// =======================
// GET /type_depense/index — Liste des types de dépenses
// =======================
exports.list = async (req, res) => {
  try {
    const types = await TypeDepense.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('type_depense/index', {
      types,
      typeEdit: null,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des types de dépenses'
    });
  } catch (error) {
    console.error('Erreur chargement types de dépenses :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des types de dépenses.', 'danger');
  }
};

// =======================
// POST /type_depense/createOrUpdate — Créer ou modifier un type de dépense
// =======================
exports.createOrUpdate = async (req, res) => {
  const { id, libelle } = req.body;

  if (!libelle) {
    return redirectWithMessage(req, res, 'Le libellé est obligatoire.', 'danger');
  }

  try {
    if (id) {
      const type = await TypeDepense.findByPk(id);
      if (!type) {
        return redirectWithMessage(req, res, 'Type de dépense introuvable.', 'danger');
      }

      await type.update({ libelle });
      return redirectWithMessage(req, res, 'Type de dépense modifié avec succès.', 'warning');
    } else {
      await TypeDepense.create({ libelle });
      return redirectWithMessage(req, res, 'Type de dépense ajouté avec succès.', 'success');
    }
  } catch (error) {
    console.error('Erreur création/mise à jour type dépense :', error);

    const msg = error.name === 'SequelizeUniqueConstraintError'
      ? 'Ce libellé existe déjà.'
      : 'Erreur lors de la création ou mise à jour du type de dépense.';

    return redirectWithMessage(req, res, msg, 'danger');
  }
};

// =======================
// POST /type_depense/delete/:id 
// =======================
exports.delete = async (req, res) => {
  const { id } = req.params;
  const deletedBy = req.session?.user?.username || 'admin';

  try {
    const type = await TypeDepense.findByPk(id);
    if (!type) {
      return redirectWithMessage(req, res, 'Type introuvable.', 'danger');
    }

    await type.update({
      deletedAt: new Date(),
      deletedBy
    });

    return redirectWithMessage(req, res, `Type "${type.libelle}" marqué comme supprimé.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression du type de dépense :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression du type de dépense.', 'danger');
  }
};

// =======================
// GET /type_depense/edit/:id 
// =======================
exports.edit = async (req, res) => {
  const id = req.params.id;

  try {
    const typeEdit = await TypeDepense.findByPk(id);
    if (!typeEdit) {
      return redirectWithMessage(req, res, 'Type de dépense introuvable.', 'danger');
    }

    const types = await TypeDepense.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('type_depense/index', {
      typeEdit,
      types,
      message: req.flash('message')[0] || null,
      pageTitle: 'Modifier un type de dépense'
    });
  } catch (error) {
    console.error('Erreur lors du chargement du type de dépense :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement du type de dépense.', 'danger');
  }
};
