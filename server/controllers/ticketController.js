const { now } = require('sequelize/lib/utils');
const db = require('../models');

const {sequelize, Vente, Paiement, Ticket} = db;
const Client = db.Client;
const { enregistrerSortieSachet } = require('./stockSachetController');

//  Fonction utilitaire pour rediriger avec message flash
function redirectWithMessage(req, res, msg, type = 'success', path = '/tickets/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

function redirectWithMessagevente(req, res, msg, type = 'success', path = '/ventes/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

//  Liste des commandes

exports.list = async (req, res) => {
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
  
  try {
    // Récupérer toutes les commandes et inclure les informations du client
    const tickets = await Ticket.findAll({
      include: [
        {
          model: Client,      
          attributes: ['id', 'nom', 'prenom']  
        }
      ],
      order: [['id', 'DESC']] // tri par date
    });


    
    // Récupérer tous les clients pour le formulaire de sélection
    const clients = await Client.findAll({
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });

    // Render la vue
    res.render('tickets/index', {
      tickets,
      clients,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Tickets'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des tickets :', err);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des tickets.', 'danger');
  }
};

//  Créer ou modifier une commande
exports.createOrUpdate = async (req, res) => {
  const { id, id_client, quantite, nom_chauffeur, marque_voiture } = req.body;

  // Validation de base
  if (!id_client || !quantite || !nom_chauffeur  || !marque_voiture) {
    return redirectWithMessage(req, res, 'Tous les champs sont obligatoires.', 'danger');
  }



  try {
    let statut='NON LIVRE'
    if (id) {
      //  Mise à jour
      const ticket = await Ticket.findByPk(id);
      if (!ticket) {
        return redirectWithMessage(req, res, 'Ticket introuvable.', 'danger');
      }
      
      await ticket.update({  id_client, quantite, nom_chauffeur, marque_voiture, statut});
      return redirectWithMessage(req, res, 'Ticket mise à jour avec succès.', 'warning');
    } else {
      //  Création
      
      await Ticket.create({ id_client, quantite, nom_chauffeur, marque_voiture, statut });
      return redirectWithMessage(req, res, 'Ticket créée avec succès.', 'success');
    }
  } catch (err) {
    console.error('Erreur lors de la création/mise à jour du ticket :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la création ou modification du ticket.', 'danger');
  }
};



exports.livrer = async (req, res) => {

  const id=req.params.id;

  try {
    if (id) {
      //  Mise à jour
      const ticket = await Ticket.findByPk(id);
      if (!ticket) {
        return redirectWithMessage(req, res, 'Ticket introuvable.', 'danger');
      }
      let statut='LIVRE';
      let date_livraison=now();
      await ticket.update({ statut, date_livraison });
      return redirectWithMessage(req, res, 'Ticket mise à jour avec succès.', 'warning');
    } 
     return redirectWithMessage(req, res, 'Erreur lors de la validation du ticket.', 'danger');
  } catch (err) {
    console.error('Erreur lors de la validation à jour du ticket :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la validationdu ticket.', 'danger');
  }
};

//  Suppression physique
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket || ticket.statut != 'NON LIVRE') {
      return redirectWithMessage(req, res, 'Commande introuvable. ou livré', 'danger');
    }

    await ticket.destroy(); 
    return redirectWithMessage(req, res, `Ticket #${id} supprimée avec succès.`, 'success');
  } catch (err) {
    console.error('Erreur lors de la suppression de la ticket :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la suppression du ticket.', 'danger');
  }
};
 

//  validation physique
exports.vente = async (req, res) => {
  const { id } = req.params;
   const t = await sequelize.transaction();

  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return redirectWithMessage(req, res, 'Ticket introuvable.', 'danger');
    } 
    statut='VENTE EFFECTUEE';
    type_vente='livrer';
    const montantTotal = ticket.quantite * 350;
quantite=ticket.quantite;
prix_unitaire=350;
id_client=ticket.id_client;
type_paiement='echellonner';
date_vente=ticket.date_livraison; 
user=req.session?.user?.id;

    await ticket.update({ statut}, {transaction: t});


    

    const vente = await Vente.create(
        { type_vente, quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement, date_vente, user },
        { transaction: t });

         await Paiement.create({ id_vente: vente.id, montant: 0, date: date_vente }, { transaction: t });

         await enregistrerSortieSachet({
           quantite,
           date: date_vente,
           motif: `Ticket #${ticket.id} validé (vente #${vente.id})`,
           id_vente: vente.id,
           createdBy: req.session?.user?.login || null
         }, t);

await t.commit();

    return redirectWithMessage(req, res, ` vente enregistré avec succès.`, 'success');

  } catch (err) {
    console.error('Erreur lors de la creation  de la vente :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la creation  de la vente.', 'danger');
  }
};
