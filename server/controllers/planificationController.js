const db = require('../models');
const Personnel = db.Personnel;
const Planification = db.Planification;
const { creerCongePourPersonnel } = require('./congeController');

// =======================
// Fonction utilitaire commune
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/planification/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Date du jour au format YYYY-MM-DD (heure locale du serveur)
function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

// Nombre de jours restants avant la date de départ (peut être négatif si déjà atteinte)
function joursAvantDepart(date_depart) {
  return Math.floor((new Date(date_depart) - new Date(todayStr())) / 86400000);
}

// =======================
// Page de planification : liste des agents actifs
// =======================
exports.formIndex = async (req, res) => {
  try {
    const personnels = await Personnel.findAll({
      where: { deletedAt: null, deletedBy: null, etat: true },
      order: [['nom', 'ASC']]
    });

    res.render('planification/index', {
      personnels,
      message: req.flash('message')[0] || null,
      pageTitle: 'Planifier un congé'
    });
  } catch (error) {
    console.error('Erreur lors du chargement de la planification :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement de la planification.', 'danger');
  }
};

// =======================
// Créer une planification pour un agent (pas de contrôle d'éligibilité, juste actif)
// =======================
exports.create = async (req, res) => {
  const { id_personnel, date_depart, nombre_jours } = req.body;

  if (!id_personnel || !date_depart || !nombre_jours) {
    return redirectWithMessage(req, res, 'Agent, date de départ et nombre de jours sont obligatoires.', 'danger');
  }

  const jours = parseInt(nombre_jours, 10);
  if (!jours || jours <= 0) {
    return redirectWithMessage(req, res, 'Le nombre de jours doit être supérieur à 0.', 'danger');
  }

  try {
    const personnel = await Personnel.findByPk(id_personnel);
    if (!personnel || !personnel.etat) {
      return redirectWithMessage(req, res, 'Agent introuvable ou inactif.', 'danger');
    }

    const depart = new Date(date_depart);
    const retour = new Date(depart);
    retour.setDate(retour.getDate() + jours);
    const dateRetourStr = retour.toISOString().slice(0, 10);

    // Un agent peut être planifié plusieurs fois, mais pas sur des périodes qui se chevauchent
    const planifsExistantes = await Planification.findAll({ where: { id_personnel } });
    const chevauche = planifsExistantes.some(p => date_depart <= p.date_retour && p.date_depart <= dateRetourStr);

    if (chevauche) {
      return redirectWithMessage(req, res, `"${personnel.nom}" a déjà une planification sur cette période.`, 'danger');
    }

    await Planification.create({
      id_personnel,
      date_depart,
      nombre_jours: jours,
      date_retour: dateRetourStr
    });

    return redirectWithMessage(req, res, `Congé planifié pour "${personnel.nom}".`, 'success');
  } catch (error) {
    console.error('Erreur lors de la planification du congé :', error);
    return redirectWithMessage(req, res, 'Erreur lors de la planification du congé.', 'danger');
  }
};

// =======================
// Liste des planifications, triée par date de départ croissante
// =======================
exports.liste = async (req, res) => {
  try {
    const planifications = await Planification.findAll({
      include: [{ model: Personnel, as: 'personnel', attributes: ['id', 'nom', 'prenom'] }],
      order: [['date_depart', 'ASC']]
    });

    res.render('planification/liste', {
      planifications,
      today: todayStr(),
      message: req.flash('message')[0] || null,
      pageTitle: 'Liste des planifications'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des planifications :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des planifications.', 'danger', '/planification/liste');
  }
};

// =======================
// Valider une planification : crée le congé correspondant puis supprime la planification
// =======================
exports.valider = async (req, res) => {
  const { id } = req.params;

  try {
    const planification = await Planification.findByPk(id, {
      include: [{ model: Personnel, as: 'personnel', attributes: ['id', 'nom'] }]
    });
    if (!planification) {
      return redirectWithMessage(req, res, 'Planification introuvable.', 'danger', '/planification/liste');
    }

    if (joursAvantDepart(planification.date_depart) > 7) {
      return redirectWithMessage(req, res, 'La validation n\'est possible qu\'à partir d\'une semaine avant la date de départ.', 'danger', '/planification/liste');
    }

    const result = await creerCongePourPersonnel(
      planification.id_personnel,
      planification.date_depart,
      planification.nombre_jours,
      null
    );

    if (!result.success) {
      return redirectWithMessage(req, res, result.message, 'danger', '/planification/liste');
    }

    await planification.destroy();

    return redirectWithMessage(req, res, `Congé validé et créé pour "${result.personnel.nom}".`, 'success', '/planification/liste');
  } catch (error) {
    console.error('Erreur lors de la validation de la planification :', error);
    return redirectWithMessage(req, res, 'Erreur lors de la validation de la planification.', 'danger', '/planification/liste');
  }
};

// =======================
// Supprimer (annuler) une planification — suppression physique
// =======================
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const planification = await Planification.findByPk(id);
    if (!planification) {
      return redirectWithMessage(req, res, 'Planification introuvable.', 'danger', '/planification/liste');
    }

    await planification.destroy();

    return redirectWithMessage(req, res, 'Planification supprimée.', 'success', '/planification/liste');
  } catch (error) {
    console.error('Erreur lors de la suppression de la planification :', error);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression de la planification.', 'danger', '/planification/liste');
  }
};
