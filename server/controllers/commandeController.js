const db = require('../models');
const {Commande, sequelize, Vente, Paiement} = db;
const Client = db.Client;

//  Fonction utilitaire pour rediriger avec message flash
function redirectWithMessage(req, res, msg, type = 'success', path = '/commandes/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

function redirectWithMessagevente(req, res, msg, type = 'success', path = '/ventes/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

//  Liste des commandes

exports.list = async (req, res) => {
  try {
    // Récupérer toutes les commandes et inclure les informations du client
    const commandes = await Commande.findAll({
      include: [
        {
          model: Client,      
          attributes: ['id', 'nom', 'prenom']  
        }
      ],
      order: [['date_commande', 'DESC']] // tri par date
    });

    // Récupérer tous les clients pour le formulaire de sélection
    const clients = await Client.findAll({
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });

    // Render la vue
    res.render('commandes/index', {
      commandes,
      clients,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Commandes'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des commandes :', err);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des commandes.', 'danger');
  }
};

//  Créer ou modifier une commande
exports.createOrUpdate = async (req, res) => {
  const { id, id_client, quantite, prix_unitaire,date_commande } = req.body;

  // Validation de base
  if (!id_client || !quantite || !prix_unitaire  || !date_commande) {
    return redirectWithMessage(req, res, 'Tous les champs sont obligatoires.', 'danger');
  }



  try {
    if (id) {
      //  Mise à jour
      const commande = await Commande.findByPk(id);
      if (!commande) {
        return redirectWithMessage(req, res, 'Commande introuvable.', 'danger');
      }

      await commande.update({ id_client, quantite, statut ,date_commande});
      return redirectWithMessage(req, res, 'Commande mise à jour avec succès.', 'warning');
    } else {
      //  Création
      statut='en attente';
      await Commande.create({ id_client, quantite, statut, prix_unitaire, date_commande });
      return redirectWithMessage(req, res, 'Commande créée avec succès.', 'success');
    }
  } catch (err) {
    console.error('Erreur lors de la création/mise à jour de la commande :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la création ou modification de la commande.', 'danger');
  }
};

//  Suppression physique
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const commande = await Commande.findByPk(id);
    if (!commande) {
      return redirectWithMessage(req, res, 'Commande introuvable.', 'danger');
    }

    await commande.destroy(); 
    return redirectWithMessage(req, res, `Commande #${id} supprimée avec succès.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression de la commande :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression de la commande.', 'danger');
  }
};
 

//  validation physique
exports.valider = async (req, res) => {
  const { id } = req.params;
   const t = await sequelize.transaction();

  try {
    const commande = await Commande.findByPk(id);
    if (!commande) {
      return redirectWithMessage(req, res, 'Commande introuvable.', 'danger');
    }
    statut='livrée';
    type_vente='livrer';
    const montantTotal = commande.quantite * commande.prix_unitaire;
quantite=commande.quantite;
prix_unitaire=commande.prix_unitaire;
id_client=commande.id_client;
type_paiement='echellonner';
date_vente=commande.date_commande; 
user=req.session?.user?.id;

    await commande.update({ statut}, {transaction: t});


    

    const vente = await Vente.create(
        { type_vente, quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement, date_vente, user },
        { transaction: t });

         await Paiement.create({ id_vente: vente.id, montant: 0, date: date_vente }, { transaction: t });

await t.commit();
     
    return redirectWithMessagevente(req, res, `Commande #${id} validé et vente enregistré avec succès.`, 'success');

  } catch (err) {
    console.error('Erreur lors de la suppression de la commande :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression de la commande.', 'danger');
  }
};
