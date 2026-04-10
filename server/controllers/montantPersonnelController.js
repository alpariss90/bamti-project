const db = require('../models');
const { Personnel, MontantPersonnel , Salaire} = db;

//  Fonction utilitaire pour redirection + message
function redirectWithMessage(req, res, msg, type = 'success', path = '/montant_personnel/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

//  Liste des personnels + salaires
exports.list = async (req, res) => {
  try {
    const personnels = await Personnel.findAll({
      include: [
        {
          model: MontantPersonnel,
          required: false // LEFT JOIN
        }
      ],
      where: {
        deletedAt: null,
        etat: true
      },
      order: [['nom', 'ASC']]
    });

    res.render('montant_personnel/index', {
      personnels,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des salaires du personnel'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des salaires :', err);
    return redirectWithMessage(req, res, 'Erreur lors du chargement des salaires.', 'danger');
  }
};

//  Modifier ou définir un salaire
exports.updateSalaire = async (req, res) => {
  const { id_personnel, salaire } = req.body;

  if (!id_personnel || !salaire) {
    return redirectWithMessage(req, res, 'Veuillez remplir tous les champs.', 'danger');
  }

  try {
    const personnel = await Personnel.findByPk(id_personnel);
    if (!personnel) {
      return redirectWithMessage(req, res, 'Personnel introuvable.', 'danger');
    }

    // Vérifie s’il y a déjà un enregistrement dans montant_personnel
    let montant = await MontantPersonnel.findOne({ where: { id_personnel } });

    if (montant) {
      // Mise à jour du salaire existant
      await montant.update({ salaire });
    } else {
      // Création d’un nouveau salaire
      montant = await MontantPersonnel.create({ id_personnel, salaire });
    }

    // Met à jour la table personnel pour synchroniser le champ salaire
    await personnel.update({ salaire });
    

    return redirectWithMessage(req, res, `Salaire du personnel ${personnel.nom} mis à jour avec succès.`, 'success');
  } catch (err) {
    console.error('Erreur mise à jour salaire :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la mise à jour du salaire.', 'danger');
  }
};
