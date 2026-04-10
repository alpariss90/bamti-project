const db = require('../models');
const Personnel = db.Personnel;

// =======================
// Fonction utilitaire pour rediriger avec message
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/person/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// =======================
// Liste des personnels
// =======================
exports.list = async (req, res) => {
  try {
    const personnels = await Personnel.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });

    res.render('person/index', {
      personnels,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Personnels'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des personnels :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des personnels.', 'danger');
  }
};

// =======================
// Créer ou modifier un personnel
// =======================
exports.createOrUpdate = async (req, res) => {
  const { id, nom, prenom, telephone } = req.body;

  if (!nom || !prenom) {
    return redirectWithMessage(req, res, 'Nom et prénom sont obligatoires.', 'danger');
  }

  try {
    if (id) {
      const personnel = await Personnel.findByPk(id);
      if (!personnel) {
        return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
      }

      await personnel.update({ nom, prenom, telephone });
      return redirectWithMessage(req, res, 'Personnel modifié avec succès.', 'warning');
    } else {
      await Personnel.create({ nom, prenom, telephone });
      return redirectWithMessage(req, res, 'Personnel ajouté avec succès.', 'success');
    }
  } catch (error) {
    console.error('Erreur lors de la création/mise à jour du personnel :', error);

    const msg = error.name === 'SequelizeUniqueConstraintError'
      ? 'Téléphone déjà utilisé.'
      : 'Erreur lors de la création ou mise à jour du personnel.';

    return redirectWithMessage(req, res, msg, 'danger');
  }
};

// =======================
// Supprimer un personnel
// =======================
exports.delete = async (req, res) => {
  const { id } = req.params;
  const deletedBy = req.session?.user?.username || 'admin';

  try {
    const personnel = await Personnel.findByPk(id);
    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }

    await personnel.update({
      deletedAt: new Date(),
      deletedBy
    });

    return redirectWithMessage(req, res, `Personnel "${personnel.nom}" marqué comme supprimé.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression du personnel :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression du personnel.', 'danger');
  }
};

// =======================
// Activer un personnel
// =======================
exports.activate = async (req, res) => {
  try {
    const personnel = await Personnel.findByPk(req.params.id);
    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }

    await personnel.update({ etat: true });
    return redirectWithMessage(req, res, 'Personnel activé avec succès.', 'success');
  } catch (error) {
    console.error('Erreur activation personnel :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l’activation du personnel.', 'danger');
  }
};

// =======================
// Désactiver un personnel
// =======================
exports.deactivate = async (req, res) => {
  try {
    const personnel = await Personnel.findByPk(req.params.id);
    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }

    await personnel.update({ etat: false });
    return redirectWithMessage(req, res, 'Personnel désactivé avec succès.', 'warning');
  } catch (error) {
    console.error('Erreur désactivation personnel :', error);
    return redirectWithMessage(req, res, 'Erreur lors de la désactivation du personnel.', 'danger');
  }
};
