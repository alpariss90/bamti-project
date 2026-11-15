const { now } = require('sequelize/lib/utils');
const db = require('../models');

const {sequelize, Vente, Paiement, Ticket} = db;
const Client = db.Client;
const { enregistrerSortieSachet } = require('./stockSachetController');
const { verifierJourneeNonCloturee } = require('../services/caisse');
const { montantRecu, datePaiement } = require('../services/premierPaiement');
const { PRIX_UNITAIRE_TICKET } = require('../config/constantes');

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
      prixUnitaireTicket: PRIX_UNITAIRE_TICKET,
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
 

//  validation physique : le ticket devient une vente livrée
exports.vente = async (req, res) => {
  const { id } = req.params;

  // Date de paiement (= date de la vente) : obligatoire, au plus aujourd'hui
  const { date: date_vente, erreur: erreurDate } = datePaiement(req.body.date_paiement);
  if (erreurDate) return redirectWithMessage(req, res, erreurDate, 'danger');

  const t = await sequelize.transaction();

  try {
    const ticket = await Ticket.findByPk(id, { transaction: t });
    if (!ticket) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Ticket introuvable.', 'danger');
    }

    const quantite = ticket.quantite;
    const prix_unitaire = PRIX_UNITAIRE_TICKET;
    const montantTotal = quantite * prix_unitaire;
    const id_client = ticket.id_client;
    const user = req.session?.user?.id;

    // Montant reçu obligatoire (0 si rien payé) ; s'il couvre tout, la vente est réglée (« total »)
    const recu = montantRecu(montantTotal, req.body.montant_recu);
    if (recu.erreur) {
      await t.rollback();
      return redirectWithMessage(req, res, recu.erreur, 'danger');
    }

    // Journée déjà clôturée par l'encaisseur : plus de paiement à cette date (sauf admin, voir services/caisse.js)
    const refus = await verifierJourneeNonCloturee({ user: req.session.user, date: date_vente, montant: recu.montant, transaction: t });
    if (refus) {
      await t.rollback();
      return redirectWithMessage(req, res, refus, 'danger');
    }

    // Livreur de la vente : « nom du chauffeur - marque de la voiture » (ce qui est renseigné)
    const livreur = [ticket.nom_chauffeur, ticket.marque_voiture]
      .map(v => String(v || '').trim())
      .filter(Boolean)
      .join(' - ')
      .slice(0, 100) || null;

    await ticket.update({ statut: 'VENTE EFFECTUEE' }, { transaction: t });

    const vente = await Vente.create(
      { type_vente: 'usine', quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement: recu.type_paiement, date_vente, user, livreur },
      { transaction: t });

    // Toujours un paiement, même à 0 F (la vente reste comptée parmi les redevables)
    await Paiement.create({ id_vente: vente.id, montant: recu.montant, date: date_vente, id_user: user }, { transaction: t });

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
    await t.rollback();
    console.error('Erreur lors de la creation  de la vente :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la creation  de la vente.', 'danger');
  }
};
