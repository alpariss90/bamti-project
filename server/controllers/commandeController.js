const db = require('../models');
const {Commande, sequelize, Vente, Paiement} = db;
const Client = db.Client;
const { enregistrerSortieSachet } = require('./stockSachetController');
const { ID_CLIENT_ANONYME } = require('../config/constantes');

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
          attributes: ['id', 'nom', 'prenom', 'telephone']  
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
      idClientAnonyme: ID_CLIENT_ANONYME,
      message: req.flash('message')[0] || null,
      pageTitle: 'Gestion des Commandes'
    });
  } catch (err) {
    console.error('Erreur lors du chargement des commandes :', err);
    return redirectWithMessage(req, res, 'Erreur serveur lors du chargement des commandes.', 'danger');
  }
};

// Téléphone à enregistrer sur la commande :
// saisi (obligatoire) pour le client Anonyme, copié depuis la fiche client sinon.
// Renvoie { telephone } ou { erreur }.
async function telephoneCommande(id_client, telephoneSaisi) {
  if (Number(id_client) === ID_CLIENT_ANONYME) {
    const telephone = String(telephoneSaisi || '').trim();
    if ((telephone.match(/\d/g) || []).length < 8) {
      return { erreur: 'Pour un client Anonyme, le téléphone est obligatoire (au moins 8 chiffres).' };
    }
    return { telephone: telephone.slice(0, 20) };
  }

  const client = await Client.findByPk(id_client, { attributes: ['telephone'] });
  if (!client) return { erreur: 'Client introuvable.' };
  return { telephone: client.telephone ? String(client.telephone).slice(0, 20) : null };
}

//  Créer ou modifier une commande
exports.createOrUpdate = async (req, res) => {
  const { id, id_client, quantite, prix_unitaire,date_commande } = req.body;

  // Validation de base
  if (!id_client || !quantite || !prix_unitaire  || !date_commande) {
    return redirectWithMessage(req, res, 'Tous les champs sont obligatoires.', 'danger');
  }



  try {
    const { telephone, erreur } = await telephoneCommande(id_client, req.body.telephone);
    if (erreur) {
      return redirectWithMessage(req, res, erreur, 'danger');
    }

    if (id) {
      //  Mise à jour (le statut n'est jamais modifié ici : seule la validation le change)
      const commande = await Commande.findByPk(id);
      if (!commande) {
        return redirectWithMessage(req, res, 'Commande introuvable.', 'danger');
      }

      await commande.update({ id_client, quantite, date_commande, telephone });
      return redirectWithMessage(req, res, 'Commande mise à jour avec succès.', 'warning');
    } else {
      //  Création
      const statut = 'en attente';
      await Commande.create({ id_client, quantite, statut, prix_unitaire, date_commande, telephone });
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
 

//  Commandes du jour + en retard
exports.jour = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const demain = new Date(aujourdhui);
    demain.setDate(demain.getDate() + 1);

    const duJour = await Commande.findAll({
      where: {
        date_commande: { [Op.gte]: aujourdhui, [Op.lt]: demain },
        statut: { [Op.ne]: 'livrée' }
      },
      include: [{ model: Client, attributes: ['id', 'nom', 'prenom', 'telephone'] }],
      order: [['date_commande', 'ASC']]
    });

    const enRetard = await Commande.findAll({
      where: {
        date_commande: { [Op.lt]: aujourdhui },
        statut: 'en attente'
      },
      include: [{ model: Client, attributes: ['id', 'nom', 'prenom', 'telephone'] }],
      order: [['date_commande', 'ASC']]
    });

    res.render('commandes/jour', {
      duJour,
      enRetard,
      aujourdhui,
      message: req.flash('message')[0] || null,
      pageTitle: 'Commandes du jour'
    });
  } catch (err) {
    console.error('Erreur chargement commandes du jour :', err);
    return redirectWithMessage(req, res, 'Erreur serveur.', 'danger');
  }
};

//  validation physique : la commande passe à « livrée » et une vente est créée
exports.valider = async (req, res) => {
  const { id } = req.params;
  const livreur = String(req.body.livreur || '').trim().slice(0, 100);
  const observation_livraison = String(req.body.observation_livraison || '').trim().slice(0, 255) || null;

  if (!livreur) {
    return redirectWithMessage(req, res, 'Le nom du livreur est obligatoire pour valider la commande.', 'danger');
  }

  const t = await sequelize.transaction();

  try {
    const commande = await Commande.findByPk(id, { transaction: t });
    if (!commande) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Commande introuvable.', 'danger');
    }

    const quantite = commande.quantite;
    const prix_unitaire = commande.prix_unitaire;
    const montantTotal = quantite * prix_unitaire;
    const id_client = commande.id_client;
    const date_vente = commande.date_commande;
    const user = req.session?.user?.id;

    // Client Anonyme : on garde son numéro dans l'observation de la vente (le livreur a sa propre colonne)
    const observation = Number(id_client) === ID_CLIENT_ANONYME && commande.telephone
      ? `Tél : ${commande.telephone}`
      : null;

    await commande.update({ statut: 'livrée', livreur, observation_livraison }, { transaction: t });

    const vente = await Vente.create(
      { type_vente: 'livrer', quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement: 'echellonner', date_vente, user, observation, livreur },
      { transaction: t });

    await Paiement.create({ id_vente: vente.id, montant: 0, date: date_vente }, { transaction: t });

    await enregistrerSortieSachet({
      quantite,
      date: date_vente,
      motif: `Commande #${commande.id} validée (vente #${vente.id})`,
      id_vente: vente.id,
      createdBy: req.session?.user?.login || null
    }, t);

    await t.commit();

    return redirectWithMessagevente(req, res, `Commande #${id} validé et vente enregistré avec succès.`, 'success');

  } catch (err) {
    await t.rollback();
    console.error('Erreur lors de la validation de la commande :', err);
    return redirectWithMessage(req, res, 'Erreur lors de la validation de la commande.', 'danger');
  }
};
