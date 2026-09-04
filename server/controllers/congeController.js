const db = require('../models');
const Personnel = db.Personnel;
const Conge = db.Conge;
const ServicePerson = db.ServicePerson;

// =======================
// Fonction utilitaire commune
// =======================
function redirectWithMessage(req, res, msg, type = 'success', path = '/conge/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Date du jour au format YYYY-MM-DD (heure locale du serveur)
function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

// Nombre de mois pleins entre deux dates
function moisDeService(depuis, jusqua) {
  let mois = (jusqua.getFullYear() - depuis.getFullYear()) * 12 + (jusqua.getMonth() - depuis.getMonth());
  if (jusqua.getDate() < depuis.getDate()) mois -= 1;
  return mois;
}

// =======================
// Liste des congés
// =======================
exports.list = async (req, res) => {
  try {
    const personnels = await Personnel.findAll({
      where: { deletedAt: null, deletedBy: null, etat: true },
      order: [['nom', 'ASC']]
    });

    const conges = await Conge.findAll({
      include: [{ model: Personnel, as: 'personnel', attributes: ['id', 'nom', 'prenom'] }],
      order: [['date_depart', 'DESC']]
    });

    res.render('conge/index', {
      personnels,
      conges,
      today: todayStr(),
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des congés'
    });
  } catch (error) {
    console.error('Erreur lors du chargement des congés :', error);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des congés.', 'danger');
  }
};

// =======================
// Vérifie l'éligibilité (≥ 1 an de service) et crée le congé.
// Réutilisée par la validation d'une planification.
// Retourne { success:true, conge, personnel } ou { success:false, message }
// =======================
async function creerCongePourPersonnel(id_personnel, date_depart, nombre_jours, motif) {
  const jours = parseInt(nombre_jours, 10);
  if (!jours || jours <= 0) {
    return { success: false, message: 'Le nombre de jours doit être supérieur à 0.' };
  }

  const personnel = await Personnel.findByPk(id_personnel, {
    include: [{ model: ServicePerson, as: 'services' }]
  });
  if (!personnel) {
    return { success: false, message: 'Personnel introuvable.' };
  }

  if (!personnel.etat) {
    return { success: false, message: `"${personnel.nom}" n'est pas éligible au congé : il a été mis en fin de service (inactif).` };
  }

  const prises = (personnel.services || [])
    .filter(s => s.type === 'prise')
    .sort((a, b) => new Date(a.date_service) - new Date(b.date_service));
  const dernierePrise = prises.length ? prises[prises.length - 1] : null;

  if (!dernierePrise) {
    return { success: false, message: `Impossible de déterminer la date de prise de service de "${personnel.nom}".` };
  }

  const depuis = new Date(dernierePrise.date_service);
  const depart = new Date(date_depart);
  const moisService = moisDeService(depuis, depart);

  if (moisService < 12) {
    return { success: false, message: `"${personnel.nom}" n'a pas encore un an de service (${moisService} mois) : non éligible au congé.` };
  }

  const dateRetour = new Date(depart);
  dateRetour.setDate(dateRetour.getDate() + jours);

  const conge = await Conge.create({
    id_personnel,
    date_depart,
    nombre_jours: jours,
    date_retour: dateRetour.toISOString().slice(0, 10),
    motif: motif || null
  });

  return { success: true, conge, personnel };
}

// =======================
// Créer un congé
// =======================
exports.create = async (req, res) => {
  const { id_personnel, date_depart, nombre_jours, motif } = req.body;

  if (!id_personnel || !date_depart || !nombre_jours) {
    return redirectWithMessage(req, res, 'Personnel, date de départ et nombre de jours sont obligatoires.', 'danger');
  }

  try {
    const result = await creerCongePourPersonnel(id_personnel, date_depart, nombre_jours, motif);

    if (!result.success) {
      return redirectWithMessage(req, res, result.message, 'danger');
    }

    return redirectWithMessage(req, res, `Congé enregistré pour "${result.personnel.nom}".`, 'success');
  } catch (error) {
    console.error('Erreur lors de la création du congé :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l\'enregistrement du congé.', 'danger');
  }
};

exports.creerCongePourPersonnel = creerCongePourPersonnel;

// =======================
// Annuler (supprimer) un congé
// =======================
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const conge = await Conge.findByPk(id);
    if (!conge) {
      return redirectWithMessage(req, res, 'Congé introuvable.', 'danger');
    }

    if (conge.date_depart <= todayStr()) {
      return redirectWithMessage(req, res, 'Impossible d\'annuler : la date de départ est déjà atteinte.', 'danger');
    }

    await conge.destroy();
    return redirectWithMessage(req, res, 'Congé annulé.', 'success');
  } catch (error) {
    console.error('Erreur lors de l\'annulation du congé :', error);
    return redirectWithMessage(req, res, 'Erreur lors de l\'annulation du congé.', 'danger');
  }
};
