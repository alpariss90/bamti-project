/**
 * Controller — Synchronisation données tmp → tables principales
 * Transfère ventes_tmp / paiements_tmp / clients_tmp vers vente / paiement / client
 * pour un revendeur et une date donnés.
 */
const db = require('../models');
const {
  Revendeur, User,
  ClientTmp, VenteTmp, PaiementTmp,
  Client, Vente, Paiement,
  ClientClientTmp,
  sequelize
} = db;
const { Op } = require('sequelize');

// GET /revendeurs/sync
exports.showForm = async (req, res) => {
  try {
    const revendeurs = await Revendeur.findAll({
      where: { deletedAt: null },
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
      order: [['nom', 'ASC']]
    });

    const today = new Date().toISOString().split('T')[0];

    res.render('revendeurs/sync_donnees', {
      revendeurs,
      today,
      result: null,
      error: null,
      message: null,
      pageTitle: 'Synchroniser les données'
    });
  } catch (err) {
    console.error('[SyncForm]', err);
    req.flash('message', { text: 'Erreur serveur.', type: 'danger' });
    res.redirect('/revendeurs/index');
  }
};

// POST /revendeurs/sync
exports.syncData = async (req, res) => {
  const { id_revendeur, date_sync } = req.body;

  // Recharge le formulaire avec un message d'erreur
  const renderWithError = async (error) => {
    const revendeurs = await Revendeur.findAll({
      where: { deletedAt: null },
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
      order: [['nom', 'ASC']]
    });
    const today = new Date().toISOString().split('T')[0];
    res.render('revendeurs/sync_donnees', {
      revendeurs, today,
      result: null,
      error,
      message: null,
      pageTitle: 'Synchroniser les données'
    });
  };

  if (!id_revendeur || !date_sync) {
    return renderWithError('Veuillez sélectionner un revendeur et une date.');
  }

  const t = await sequelize.transaction();

  try {
    const rev = await Revendeur.findByPk(id_revendeur, {
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }]
    });
    if (!rev) {
      await t.rollback();
      return renderWithError('Revendeur introuvable.');
    }

    // Récupère toutes les ventes_tmp non synchronisées pour ce revendeur à cette date
    const ventesTmp = await VenteTmp.findAll({
      where: {
        user: rev.id_user,
        date_vente: date_sync,
        is_sync: false
      },
      transaction: t
    });

    if (!ventesTmp.length) {
      await t.rollback();
      const revendeurs = await Revendeur.findAll({
        where: { deletedAt: null },
        include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
        order: [['nom', 'ASC']]
      });
      const today = new Date().toISOString().split('T')[0];
      return res.render('revendeurs/sync_donnees', {
        revendeurs, today,
        result: { clients: 0, ventes: 0, paiements: 0, message: 'Aucune donnée à synchroniser pour cette date.' },
        error: null,
        message: null,
        pageTitle: 'Synchroniser les données'
      });
    }

    // ── 1. Résolution des clients ──────────────────────────────────────────────
    // Construit la map: id_client_tmp → id_client (dans la table client)
    const clientTmpIds = [...new Set(ventesTmp.map(v => v.id_client))];
    const clientIdMap = {}; // id_client_tmp → id_client réel
    let clientsSynced = 0;

    for (const tmpId of clientTmpIds) {
      if (tmpId <= 10000) {
        // Client existant: l'id dans clients_tmp est le même que dans clients
        clientIdMap[tmpId] = tmpId;
        continue;
      }

      // Vérifie si le lien existe déjà (sync partielle précédente)
      const existingLink = await ClientClientTmp.findOne({
        where: { id_client_tmp: tmpId },
        transaction: t
      });

      if (existingLink) {
        clientIdMap[tmpId] = existingLink.id_client;
        continue;
      }

      // Nouveau client à insérer dans clients
      const clientTmp = await ClientTmp.findByPk(tmpId, { transaction: t });
      if (!clientTmp) continue;

      const newClient = await Client.create({
        nom: clientTmp.nom,
        prenom: clientTmp.prenom,
        telephone: clientTmp.telephone || null,
        adresse: clientTmp.adresse || null
      }, { transaction: t });

      await ClientClientTmp.create({
        id_client_tmp: tmpId,
        id_client: newClient.id
      }, { transaction: t });

      await ClientTmp.update(
        { is_sync: true },
        { where: { id: tmpId }, transaction: t }
      );

      clientIdMap[tmpId] = newClient.id;
      clientsSynced++;
    }

    // ── 2. Insertion des ventes ────────────────────────────────────────────────
    const venteTmpIdMap = {}; // id_vente_tmp → id_vente réel
    let ventesSynced = 0;

    for (const vt of ventesTmp) {
      const realClientId = clientIdMap[vt.id_client];
      if (!realClientId) continue;

      const newVente = await Vente.create({
        type_vente: vt.type_vente,
        quantite: vt.quantite,
        observation: vt.observation || null,
        type_paiement: vt.type_paiement,
        montant: vt.montant,
        prix_unitaire: vt.prix_unitaire,
        date_vente: vt.date_vente,
        id_client: realClientId,
        user: vt.user
      }, { transaction: t });

      venteTmpIdMap[vt.id] = newVente.id;
      ventesSynced++;

      await VenteTmp.update(
        { is_sync: true },
        { where: { id: vt.id }, transaction: t }
      );
    }

    // ── 3. Insertion des paiements ─────────────────────────────────────────────
    const venteTmpIds = Object.keys(venteTmpIdMap).map(Number);
    const paiementsTmp = await PaiementTmp.findAll({
      where: {
        id_vente: { [Op.in]: venteTmpIds },
        is_sync: false
      },
      transaction: t
    });

    let paiementsSynced = 0;

    for (const pt of paiementsTmp) {
      const realVenteId = venteTmpIdMap[pt.id_vente];
      if (!realVenteId) continue;

      await Paiement.create({
        montant: pt.montant,
        date: pt.date,
        id_vente: realVenteId,
        observation: pt.observation || null
      }, { transaction: t });

      paiementsSynced++;

      await PaiementTmp.update(
        { is_sync: true },
        { where: { id: pt.id }, transaction: t }
      );
    }

    await t.commit();

    const revendeurs = await Revendeur.findAll({
      where: { deletedAt: null },
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
      order: [['nom', 'ASC']]
    });
    const today = new Date().toISOString().split('T')[0];

    res.render('revendeurs/sync_donnees', {
      revendeurs, today,
      result: {
        clients: clientsSynced,
        ventes: ventesSynced,
        paiements: paiementsSynced,
        revendeur: `${rev.prenom} ${rev.nom}`,
        date: date_sync,
        message: null
      },
      error: null,
      message: null,
      pageTitle: 'Synchroniser les données'
    });
  } catch (err) {
    await t.rollback();
    console.error('[SyncData]', err);
    return renderWithError(`Erreur lors de la synchronisation : ${err.message}`);
  }
};
