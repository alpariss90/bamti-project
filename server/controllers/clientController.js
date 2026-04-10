const db = require('../models');
const Client = db.Client;

// Affichage de la page clients + liste
exports.list = async (req, res) => {
  try {
     const clients = await Client.findAll({
      where: {
        deletedAt: null,
        deletedBy: null
      }
    });
    res.render('personnes/index', {
      clients,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Clients'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des clients :', err);
    req.flash('message', 'Erreur serveur lors du chargement des clients.', 'danger');
    res.redirect('/personnes/index');
  }
};

// Fonction utilitaire pour rediriger avec message
function redirectWithMessage(req, res, msg, type = 'success', path = '/personnes/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

// Créer ou mettre à jour un client
exports.createOrUpdate = async (req, res) => {
  const { id, nom, prenom, telephone, adresse } = req.body;

  if (!nom) {
    return redirectWithMessage(req, res, 'Le nom du client est obligatoire.', 'danger');
  }

  try {
    if (id) {
      const client = await Client.findByPk(id);
      if (!client) {
        return redirectWithMessage(req, res, 'Client introuvable.', 'danger');
      }

      await client.update({ nom, prenom, telephone, adresse });
      return redirectWithMessage(req, res, 'Client mis à jour avec succès.', 'warning');
    } else {
      await Client.create({ nom, prenom, telephone, adresse });
      return redirectWithMessage(req, res, 'Client ajouté avec succès.', 'success');
    }
  } catch (err) {
    console.error('Erreur lors de la création/mise à jour :', err);
   return redirectWithMessage(req, res, 'Erreur lors de la création ou modification du client.', 'danger');

    
  }
};

// Supprimer un client
exports.delete = async (req, res) => {
  const { id } = req.params;
  const deletedBy = req.session?.user?.username || 'admin'; // par exemple, à adapter selon le système

  try {
    const client = await Client.findByPk(id);
    if (!client) {
      return redirectWithMessage(req, res, 'Client introuvable.', 'danger');
    }

    await client.update({
      deletedAt: new Date(),
      deletedBy: deletedBy
    });

    return redirectWithMessage(req, res, `Client "${client.nom}" marqué comme supprimé.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression du client :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression du client.', 'danger');
  }
};
