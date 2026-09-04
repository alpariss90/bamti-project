const { Op } = require('sequelize');
const db = require('../models');
const Personnel = db.Personnel;
const Profil = db.Profil;
const ServicePerson = db.ServicePerson;
const Conge = db.Conge;

// =======================
// Fonction utilitaire pour rediriger avec message
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/person/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Date du jour au format YYYY-MM-DD (heure locale du serveur)
function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
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
      },
      include: [
        { model: Profil, as: 'profil', attributes: ['id', 'libelle'] },
        { model: ServicePerson, as: 'services', separate: true, order: [['date_service', 'ASC'], ['id', 'ASC']] },
        { model: Conge, as: 'conges', separate: true, order: [['date_depart', 'DESC']] }
      ]
    });

    const profils = await Profil.findAll({
      where: { deletedAt: null, deletedBy: null },
      order: [['libelle', 'ASC']]
    });

    res.render('person/index', {
      personnels,
      profils,
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
  const { id, nom, prenom, telephone, date_prise_service, id_profil } = req.body;

  if (!nom || !prenom) {
    return redirectWithMessage(req, res, 'Nom et prénom sont obligatoires.', 'danger');
  }

  if (date_prise_service && date_prise_service > todayStr()) {
    return redirectWithMessage(req, res, 'La date de prise de service ne peut pas être postérieure à aujourd\'hui.', 'danger');
  }

  const data = {
    nom,
    prenom,
    telephone,
    date_prise_service: date_prise_service || null,
    id_profil: id_profil || null
  };

  try {
    if (id) {
      const personnel = await Personnel.findByPk(id);
      if (!personnel) {
        return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
      }

      const avaitDejaDatePriseService = !!personnel.date_prise_service;

      await personnel.update(data);

      if (!avaitDejaDatePriseService && data.date_prise_service) {
        await ServicePerson.create({
          date_service: data.date_prise_service,
          type: 'prise',
          id_personnel: personnel.id,
          motif: ''
        });
      }

      return redirectWithMessage(req, res, 'Personnel modifié avec succès.', 'warning');
    } else {
      const personnel = await Personnel.create(data);

      if (data.date_prise_service) {
        await ServicePerson.create({
          date_service: data.date_prise_service,
          type: 'prise',
          id_personnel: personnel.id,
          motif: ''
        });
      }

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
// Fin de service d'un personnel
// =======================
exports.finService = async (req, res) => {
  const { id } = req.params;
  const { date_service, motif } = req.body;

  if (!date_service || !motif) {
    return redirectWithMessage(req, res, 'La date et le motif sont obligatoires.', 'danger');
  }

  if (date_service > todayStr()) {
    return redirectWithMessage(req, res, 'La date fin de service ne peut pas être postérieure à aujourd\'hui.', 'danger');
  }

  try {
    const personnel = await Personnel.findByPk(id);
    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }

    const today = todayStr();
    const congeActif = await Conge.findOne({
      where: {
        id_personnel: id,
        date_depart: { [Op.lte]: today },
        date_retour: { [Op.gte]: today }
      }
    });

    if (congeActif) {
      return redirectWithMessage(req, res, `Impossible de mettre fin au service : "${personnel.nom}" est actuellement en congé.`, 'danger');
    }

    await ServicePerson.create({
      date_service,
      type: 'arret',
      id_personnel: personnel.id,
      motif
    });

    await personnel.update({ etat: false });

    return redirectWithMessage(req, res, `Fin de service enregistrée pour "${personnel.nom}".`, 'success');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la fin de service :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l\'enregistrement de la fin de service.', 'danger');
  }
};

// =======================
// Reprise de service d'un personnel
// =======================
exports.repriseService = async (req, res) => {
  const { id } = req.params;
  const { date_service, motif } = req.body;

  if (!date_service || !motif) {
    return redirectWithMessage(req, res, 'La date et le motif sont obligatoires.', 'danger');
  }

  if (date_service > todayStr()) {
    return redirectWithMessage(req, res, 'La date de reprise de service ne peut pas être postérieure à aujourd\'hui.', 'danger');
  }

  try {
    const personnel = await Personnel.findByPk(id);
    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }

    await ServicePerson.create({
      date_service,
      type: 'prise',
      id_personnel: personnel.id,
      motif
    });

    await personnel.update({ etat: true });

    return redirectWithMessage(req, res, `Reprise de service enregistrée pour "${personnel.nom}".`, 'success');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la reprise de service :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l\'enregistrement de la reprise de service.', 'danger');
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
