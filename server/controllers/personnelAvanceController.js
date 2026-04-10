const db = require('../models');
const { Personnel, MontantPersonnel, PersonnelAvance, Salaire } = db;

//  Fonction utilitaire pour message + redirection
function redirectWithMessage(req, res, msg, type = 'success', path = '/personnel_avance/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

//  Liste des avances
exports.list = async (req, res) => {
  try {
    
    const avances = await PersonnelAvance.findAll({
      include: [{ model: Personnel, as: 'personnel', attributes: ['nom', 'prenom'] }],
      order: [['annee', 'DESC'], ['mois', 'DESC']]
    });

    const personnels = await Personnel.findAll({
      where: { etat: true },
      attributes: ['id', 'nom', 'prenom'],
      order: [['nom', 'ASC']]
    });

    res.render('personnel_avance/index', { 
      avances, 
      personnels,          
      message: req.flash('message')[0] || null, 
      pageTitle: 'Gestion des avances du personnel' 
    });
  } catch (err) {
    console.error('Erreur chargement avances :', err);
    return redirectWithMessage(req, res, 'Erreur lors du chargement des avances.', 'danger');
  }
};


//  Création d’une avance du personnel + enregistrement dans la table salaires
// Créer une avance
exports.create = async (req, res) => {
  try {
    let { id_personnel, mois, annee, observation, montant, type } = req.body;

    if (!id_personnel || !mois || !annee || !observation || !montant || !type) {
      return redirectWithMessage(req, res, 'Tous les champs sont obligatoires.', 'danger');
    }

    montant = parseFloat(montant);
    const personnel = await Personnel.findByPk(id_personnel);

    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }
     if (!personnel.etat) {
      return redirectWithMessage(req, res, 'Impossible de créer une avance pour un personnel inactif.', 'warning');
    }

    // Déterminer le montant final selon le type
    const montantFinal = type === 'credit' ? -Math.abs(montant) : Math.abs(montant);

    // Créer l'avance
    await PersonnelAvance.create({ id_personnel, mois, annee, observation, montant: montantFinal, type });

    // Récupérer le salaire de base du personnel
    const montant_salaire = personnel.salaire || 0; // si pas défini, mettre 0

    // Enregistrement automatique dans la table Salaires
    // await Salaire.create({
    //   id_personnel,
    //   mois,
    //   annee,
    //   montant_credit: type === 'credit' ? Math.abs(montant) : 0,
    //   montant_gratification: type === 'gratification' ? Math.abs(montant) : 0,
    //   montant_salaire // <- prend le salaire depuis Personnel
    // });

    return redirectWithMessage(req, res, 'Avance enregistrée avec succès .', 'success');

  } catch (err) {
    console.error('Erreur lors de la création de l’avance :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la création de l’avance.', 'danger');
  }
};
