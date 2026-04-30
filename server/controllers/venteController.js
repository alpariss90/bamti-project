const db = require('../models');
const { Vente, User, Paiement, Client, sequelize } = db;
const { Op } = require('sequelize');

// Fonction utilitaire pour rediriger avec message
function redirectWithMessage(req, res, msg, type = 'success', path = '/ventes/index') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}


function redirectWithMessageCaissier(req, res, msg, type = 'success', path = '/ventes/index/caissier') {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}




// Liste des ventes
exports.list = async (req, res) => {
  try {
    const ventes = await Vente.findAll({
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['id', 'montant', 'date'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const ventesData = ventes.map(v => {
      const montantTotal = v.quantite * v.prix_unitaire;
      const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
      const reste = v.type_paiement === 'total' ? 0 : montantTotal - montantPayes;
      return { ...v.toJSON(), montantTotal, montantPayes, reste };
    });

    const clients = await Client.findAll({ attributes: ['id', 'nom', 'prenom'], order: [['nom', 'ASC']]});

    res.render('ventes/index', { ventes: ventesData, clients, message: req.flash('message')[0] || null, pageTitle: 'Gestion des ventes' });
  } catch (err) {
    console.error(err);
    redirectWithMessage(req, res, 'Erreur serveur lors du chargement des ventes.', 'danger');
  } 
};

// Liste caissier
exports.caissier = async (req, res) => {
  try {
    const ventes = await Vente.findAll({  where: { user: req.session.user.id},
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['id', 'montant', 'date'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const ventesData = ventes.map(v => {
      const montantTotal = v.quantite * v.prix_unitaire;
      const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
      const reste = v.type_paiement === 'total' ? 0 : montantTotal - montantPayes;
      return { ...v.toJSON(), montantTotal, montantPayes, reste };
    });

    const today = new Date();
today.setHours(0, 0, 0, 0); // Set to beginning of today

    const montantJour = ventesData
  .filter(v => {
    const saleDate = new Date(v.createdAt);
    return saleDate >= today;
  })
  .reduce((total, v) => total + v.montantTotal, 0);

//console.log(`Total sales for today: ${montantJour}`);

    const clients = await Client.findAll({ attributes: ['id', 'nom', 'prenom'], order: [['nom', 'ASC']]});

    res.render('ventes/caissier', { ventes: ventesData, clients, montantJour, message: req.flash('message')[0] || null, pageTitle: 'Gestion des ventes' });
  } catch (err) {
    console.error(err);
    redirectWithMessage(req, res, 'Erreur serveur lors du chargement des ventes.', 'danger');
  } 
};

//redevable
exports.redevable = async (req, res) => {
  try {
    const ventes = await Vente.findAll({
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['id', 'montant', 'date'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const ventesData = ventes.map(v => {
      const montantTotal = v.quantite * v.prix_unitaire;
      const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
      const reste = v.type_paiement === 'total' ? 0 : montantTotal - montantPayes;
      return { ...v.toJSON(), montantTotal, montantPayes, reste };
    }).filter(v => v.reste > 0);

    const clients = await Client.findAll({ attributes: ['id', 'nom', 'prenom'], order: [['nom', 'ASC']]});

    res.render('ventes/redevable', { ventes: ventesData, clients, message: req.flash('message')[0] || null, pageTitle: 'Gestion des redevable' });
  } catch (err) {
    console.error(err);
    redirectWithMessage(req, res, 'Erreur serveur lors du chargement des ventes.', 'danger');
  } 
};



//redevableprint
exports.redevableprint = async (req, res) => {
  try {
    const ventes = await Vente.findAll({
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['id', 'montant', 'date'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const ventesData = ventes.map(v => {
      const montantTotal = v.quantite * v.prix_unitaire;
      const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
      const reste = v.type_paiement === 'total' ? 0 : montantTotal - montantPayes;
      return { ...v.toJSON(), montantTotal, montantPayes, reste };
    }).filter(v => v.reste > 0);

    const clients = await Client.findAll({ attributes: ['id', 'nom', 'prenom'], order: [['nom', 'ASC']]});

    res.render('ventes/redevableprint', { ventes: ventesData, clients, message: req.flash('message')[0] || null, pageTitle: 'Gestion des redevable' });
  } catch (err) {
    console.error(err);
    redirectWithMessage(req, res, 'Erreur serveur lors du chargement des ventes.', 'danger');
  } 
};

// Créer ou mettre à jour une vente
exports.createOrUpdate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, type_vente, quantite, prix_unitaire, type_paiement, date_vente, montant_paye, id_client } = req.body;

    if (!id_client || !type_vente || !quantite || !prix_unitaire || !type_paiement || !date_vente) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Tous les champs sont obligatoires.', 'danger');
    }

    const montantTotal = quantite * prix_unitaire;

    //console.log(res.locals.currentUser.id+"+++++++++++++++++++++++++++++++");
    //console.log(req.session.user.id+"+++++++++++++++++++++++++++++++");
    

    if (!id) {
      const vente = await Vente.create(
        { type_vente, quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement, date_vente, user: req.session.user.id },
        { transaction: t }
      );

      if (type_paiement === 'total') {
        await Paiement.create({ id_vente: vente.id, montant: montantTotal, date: date_vente }, { transaction: t });
      } else if (type_paiement === 'echellonner' && montant_paye > 0) {
        await Paiement.create({ id_vente: vente.id, montant: montant_paye, date: date_vente }, { transaction: t });
      }



      await t.commit();
      return redirectWithMessage(req, res, 'Vente ajoutée avec succès.', 'success');
    } else {
      const vente = await Vente.findByPk(id);
      if (!vente) {
        await t.rollback();
        return redirectWithMessage(req, res, 'Vente introuvable.', 'danger');
      }

      await vente.update({ type_vente, quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement, date_vente }, { transaction: t });
      await t.commit();

      return redirectWithMessage(req, res, 'Vente mise à jour avec succès.', 'warning');
    }
  } catch (err) {
    console.error(err);
    await t.rollback();
    return redirectWithMessage(req, res, 'Erreur lors de l’enregistrement de la vente.', 'danger');
  }
};



exports.createOrUpdateCaissier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, type_vente, quantite, prix_unitaire, type_paiement, montant_paye, id_client } = req.body;

    if (!id_client || !type_vente || !quantite || !prix_unitaire || !type_paiement ) {
      await t.rollback();
      return redirectWithMessageCaissier(req, res, 'Tous les champs sont obligatoires.', 'danger');
    }

    const montantTotal = quantite * prix_unitaire;
    const date_vente = new Date();
    date_vente.setHours(0, 0, 0, 0);

    //console.log(res.locals.currentUser.id+"+++++++++++++++++++++++++++++++");
    //console.log(req.session.user.id+"+++++++++++++++++++++++++++++++");
    

    if (!id) {
      const vente = await Vente.create(
        { type_vente, quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement, date_vente, user: req.session.user.id },
        { transaction: t }
      );

      if (type_paiement === 'total') {
        await Paiement.create({ id_vente: vente.id, montant: montantTotal, date: date_vente }, { transaction: t });
      } else if (type_paiement === 'echellonner' && montant_paye > 0) {
        await Paiement.create({ id_vente: vente.id, montant: montant_paye, date: date_vente }, { transaction: t });
      }



      await t.commit();
      return redirectWithMessageCaissier(req, res, 'Vente ajoutée avec succès.', 'success');
    } else {
      const vente = await Vente.findByPk(id);
      if (!vente) {
        await t.rollback();
        return redirectWithMessageCaissier(req, res, 'Vente introuvable.', 'danger');
      }

      await vente.update({ type_vente, quantite, prix_unitaire, montant: montantTotal, id_client, type_paiement, date_vente }, { transaction: t });
      await t.commit();

      return redirectWithMessageCaissier(req, res, 'Vente mise à jour avec succès.', 'warning');
    }
  } catch (err) {
    console.error(err);
    await t.rollback();
    return redirectWithMessageCaissier(req, res, 'Erreur lors de l’enregistrement de la vente.', 'danger');
  }
};

// Supprimer une vente
exports.delete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const vente = await Vente.findByPk(id);
    if (!vente) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Vente introuvable.', 'danger');
    }

    await Paiement.destroy({ where: { id_vente: id }, transaction: t });
    await vente.destroy({ transaction: t });
    await t.commit();

    return redirectWithMessage(req, res, `Vente supprimée avec succès.`, 'success');
  } catch (err) {
    console.error(err);
    await t.rollback();
    return redirectWithMessage(req, res, 'Erreur lors de la suppression de la vente.', 'danger');
  }
};


exports.annuler = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const vente = await Vente.findByPk(id);


    if (!vente) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Vente introuvable.', 'danger');
    }

      const query = `
            INSERT INTO ventes_annuler 
            (id, type_vente, quantite, observation, type_paiement, montant, prix_unitaire, date_vente, id_client, user, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const observation = req.body.observation?.trim() || 'Annulée sans observation';

        const values = [
          id,
            vente.type_vente,
            vente.quantite,
            observation,
            vente.type_paiement,
            vente.montant,
            vente.prix_unitaire,
            vente.date_vente,
            vente.id_client,
            req.session.user.id,
        ];

        // Exécuter l'insertion
        const [result] = await sequelize.query(query, {
            replacements: values,
            transaction: t,
            type: sequelize.QueryTypes.INSERT
        });




    await Paiement.destroy({ where: { id_vente: id }, transaction: t });
    await vente.destroy({ transaction: t });


    await t.commit();

    return redirectWithMessage(req, res, `Vente annuller avec succès.`, 'success');
  } catch (err) {
    console.error(err);
    await t.rollback();
    return redirectWithMessage(req, res, 'Erreur lors de la annulation de la vente.', 'danger');
  }
};

// Liste des ventes annulées
exports.annulees = async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT va.id, va.type_vente, va.quantite, va.observation,
             va.type_paiement, va.montant, va.prix_unitaire,
             va.date_vente, va.createdAt, va.user,
             c.nom AS client_nom, c.prenom AS client_prenom
      FROM ventes_annuler va
      LEFT JOIN clients c ON c.id = va.id_client
      ORDER BY va.createdAt DESC
    `);
    res.render('ventes/annulees', {
      ventes: rows,
      pageTitle: 'Ventes annulées',
      message: req.flash('message')[0] || null,
    });
  } catch (err) {
    console.error('[Vente] annulees :', err);
    redirectWithMessage(req, res, 'Erreur lors du chargement des ventes annulées.', 'danger');
  }
};

// Ajouter un versement
exports.ajouterVersement = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id_vente, montant, date, observation } = req.body; // <-- Ajout du champ observation
    if (!id_vente || !montant || !date) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Tous les champs obligatoires sont requis.', 'danger', `/ventes/versements/${id_vente}`);
    }

    const vente = await Vente.findByPk(id_vente, { include: Paiement });
    if (!vente) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Vente introuvable.', 'danger', `/ventes/versements/${id_vente}`);
    }

    const montantTotal = vente.quantite * vente.prix_unitaire;
    const montantPayes = vente.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
    const reste = montantTotal - montantPayes;

    if (montantPayes >= montantTotal) {
      await t.rollback();
      return redirectWithMessage(req, res, 'Vente déjà payée.', 'warning', '/ventes/versements');
    }

    if (montant > reste) {
      await t.rollback();
      return redirectWithMessage(req, res, `Le montant dépasse le reste à payer (${reste})`, 'warning', '/ventes/index');
    }

    //  Création du paiement avec champ observation
    await Paiement.create(
      { id_vente, montant, date, observation }, // <-- champ ajouté ici
      { transaction: t }
    );

    await t.commit();
    return redirectWithMessage(req, res, 'Versement ajouté avec succès.', 'success');
  } catch (err) {
    console.error(err);
    await t.rollback();
    return redirectWithMessage(req, res, 'Erreur lors de l’ajout du versement.', 'danger', '/ventes/index');
  }
};

// Liste des versements d’un client
 exports.versementsClient = async (req, res) => { try { const { id_client } = req.params; 
 // On ne récupère que les ventes avec 






 // type_paiement = 'echelonne'
  const ventes = await Vente.findAll({ where: { id_client, type_paiement: 'echellonner' 
    // <-- le filtre important ici
     }, include: Paiement, order: [['createdAt', 'DESC']] });
     let client=await Client.findByPk(id_client);
      res.render('ventes/versements_client', { ventes, cl: client, message: req.flash('message')[0] || null, pageTitle: 'Versements du client' });
     } catch (err) { console.error(err); 
      redirectWithMessage(req, res, 'Erreur lors du chargement des versements.', 'danger'); } };


      function convertToISO(dateFR) {
  const [jour, mois, annee] = dateFR.split('/');
  return `${annee}-${mois}-${jour}`; // Format MySQL
}

exports.ventesFiltrees = async (req, res) => {
  try {
    // Si aucun filtre soumis, afficher le formulaire vide
    if (!req.query.date_debut) {
      const clients = await Client.findAll();
      const users   = await User.findAll();
      return res.render('ventes/filtre', {
        clients, users,
        ventes: [],
        montantTotalVentes: 0, montantPaye: 0, resteTotal: 0,
        id_client: '', type_vente: '', id_user: '',
        date_debut: '', date_fin: '',
        pageTitle: 'Filtrer les ventes',
        message: req.flash('message')[0] || null
      });
    }

        date_debut=req.query.date_debut || new Date().toLocaleDateString('fr-FR');

   date_fin=req.query.date_fin || new Date().toLocaleDateString('fr-FR');

   id_client=req.query.id_client || 'tous';

   type_vente=req.query.type_vente || 'tous';


    id_user=req.query.id_user || 'tous';


   
   

    const whereClause = {
      date_vente: { [Op.between]: [new Date(convertToISO(date_debut)), new Date(convertToISO(date_fin))] }
    };

    if (id_client && id_client !== 'tous') whereClause.id_client = id_client;
    if (type_vente && type_vente !== 'tous') whereClause.type_vente = type_vente;
    if (id_user && id_user !== 'tous') whereClause.user = id_user;

    // Récupérer les ventes
    const ventes = await Vente.findAll({
      where: whereClause,
      include: [
        { model: Paiement, as: 'Paiements' },
        { model: Client, as: 'Client', attributes: ['nom', 'prenom'] }
      ],
      order: [['date_vente', 'DESC']]
    });

    // Regrouper les ventes par client
    const ventesParClient = {};

    ventes.forEach(v => {
      const clientId = v.id_client;
      if (!ventesParClient[clientId]) {
        ventesParClient[clientId] = {
          client: v.Client,
          type_ventes: new Set(),
          quantite: 0,
          montantTotal: 0,
          montantPayes: 0,
          reste: 0
        };
      }

      ventesParClient[clientId].type_ventes.add(v.type_vente);
      ventesParClient[clientId].quantite += v.quantite;
      const montantTotal = v.quantite * v.prix_unitaire || 0;
      const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
      const reste = montantTotal - montantPayes;

      ventesParClient[clientId].montantTotal += montantTotal;
      ventesParClient[clientId].montantPayes += montantPayes;
      ventesParClient[clientId].reste += reste;
    });

    // Convertir en tableau pour EJS
    const ventesAggregees = Object.values(ventesParClient).map(v => ({
      ...v,
      type_ventes: Array.from(v.type_ventes).join(', ') // plusieurs types de vente possibles
    }));

    // Calculer totaux globaux
    const montantTotalVentes = ventesAggregees.reduce((sum, v) => sum + v.montantTotal, 0);
    const montantPaye = ventesAggregees.reduce((sum, v) => sum + v.montantPayes, 0);
    const resteTotal = ventesAggregees.reduce((sum, v) => sum + v.reste, 0);

    // Récupérer la liste des clients pour le filtre
    let clients = [];
    if (id_client && id_client !== 'tous') {
      const client = ventes[0]?.Client || (await Client.findByPk(id_client));
      if (client) clients.push(client);
    } else {
      clients = await Client.findAll();
    }


     let users = [];
    if (id_user && id_user !== 'tous') {
      const user = users[0]?.User || (await User.findByPk(id_user));
      if (user) users.push(user);
    } else {
      users = await User.findAll();
    }

    res.render('ventes/filtre', {
      clients, users,
      ventes: ventesAggregees,
      montantTotalVentes,
      montantPaye,
      resteTotal,
      id_client: id_client || '',
      type_vente: type_vente || '',
      date_debut: date_debut || '',
      date_fin: date_fin || '',
      pageTitle: id_client && id_client !== 'tous'
        ? `Ventes de ${clients[0]?.nom || ''} ${clients[0]?.prenom || ''} du ${date_debut} au ${date_fin}`
        : `Ventes filtrées du ${date_debut} au ${date_fin}`,
      message: req.flash('message')[0] || null
    });

  } catch (err) {
    console.error('Erreur filtrage ventes:', err);
    redirectWithMessage(req, res, 'Erreur lors du filtrage des ventes.', 'danger');
  }
};




