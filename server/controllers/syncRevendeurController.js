/**
 * Controller — Synchronisation données tmp → tables principales
 * Transfère ventes_tmp / paiements_tmp / clients_tmp vers vente / paiement / client
 * pour un revendeur et une date donnés (validation manuelle par l'admin).
 *
 * Ventes   : celles du revendeur datées du jour choisi, pas encore validées.
 * Paiements : ceux du revendeur datés du jour choisi OU AVANT, pas encore validés,
 *             y compris sur une vente validée un jour précédent (versement tardif).
 *             La vente officielle est retrouvée par ventes_tmp.id_vente_officielle.
 */
const db = require('../models');
const {
  Revendeur, User,
  ClientTmp, VenteTmp, PaiementTmp,
  Client, Vente, Paiement,
  ClientClientTmp,
  sequelize
} = db;
const { Op, QueryTypes } = require('sequelize');
const { aujourdhui } = require('../services/rapport/periode'); // date du jour à Niamey ('AAAA-MM-JJ')

// Écart toléré sur les montants (arrondis des FLOAT)
const TOLERANCE = 0.01;

function chargerRevendeurs() {
  return Revendeur.findAll({
    where: { deletedAt: null },
    include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }],
    order: [['nom', 'ASC']]
  });
}

// Éléments pas encore validés, par revendeur et par jour (ventes : date de vente ; paiements : date du versement)
async function chargerEnAttente(revendeurs) {
  const lignes = await sequelize.query(
    `SELECT t.user, t.jour, SUM(t.nb_ventes) AS nb_ventes, SUM(t.nb_paiements) AS nb_paiements
     FROM (
       SELECT vt.user, vt.date_vente AS jour, COUNT(*) AS nb_ventes, 0 AS nb_paiements
       FROM ventes_tmp vt
       WHERE vt.is_sync = 0
       GROUP BY vt.user, vt.date_vente
       UNION ALL
       SELECT vt.user, pt.date AS jour, 0 AS nb_ventes, COUNT(*) AS nb_paiements
       FROM paiements_tmp pt
       JOIN ventes_tmp vt ON vt.id = pt.id_vente
       WHERE pt.is_sync = 0
       GROUP BY vt.user, pt.date
     ) t
     GROUP BY t.user, t.jour
     ORDER BY t.jour ASC, t.user ASC`,
    { type: QueryTypes.SELECT }
  );

  const revendeurParUser = new Map(revendeurs.map(r => [r.id_user, r]));
  return lignes.map(l => {
    const rev = revendeurParUser.get(l.user);
    return {
      id_revendeur: rev ? rev.id : null,
      revendeur: rev ? `${rev.prenom} ${rev.nom}` : `Utilisateur #${l.user}`,
      jour: typeof l.jour === 'string' ? l.jour.slice(0, 10) : new Date(l.jour).toISOString().slice(0, 10),
      nb_ventes: Number(l.nb_ventes) || 0,
      nb_paiements: Number(l.nb_paiements) || 0
    };
  });
}

// Affiche la page (formulaire + tableau des éléments en attente)
async function afficherPage(res, { result = null, error = null } = {}) {
  const revendeurs = await chargerRevendeurs();
  const enAttente = await chargerEnAttente(revendeurs);
  res.render('revendeurs/sync_donnees', {
    revendeurs,
    enAttente,
    today: aujourdhui(),
    result,
    error,
    message: null,
    pageTitle: 'Synchroniser les données'
  });
}

// GET /revendeurs/sync
exports.showForm = async (req, res) => {
  try {
    await afficherPage(res);
  } catch (err) {
    console.error('[SyncForm]', err);
    req.flash('message', { text: 'Erreur serveur.', type: 'danger' });
    res.redirect('/revendeurs/index');
  }
};

// POST /revendeurs/sync
exports.syncData = async (req, res) => {
  const { id_revendeur, date_sync } = req.body;

  if (!id_revendeur || !date_sync) {
    return afficherPage(res, { error: 'Veuillez sélectionner un revendeur et une date.' });
  }

  const t = await sequelize.transaction();

  try {
    const rev = await Revendeur.findByPk(id_revendeur, {
      include: [{ model: User, as: 'user', attributes: ['id', 'nom'] }]
    });
    if (!rev) {
      await t.rollback();
      return afficherPage(res, { error: 'Revendeur introuvable.' });
    }

    // Ventes non validées de ce revendeur à cette date
    const ventesTmp = await VenteTmp.findAll({
      where: {
        user: rev.id_user,
        date_vente: date_sync,
        is_sync: false
      },
      transaction: t
    });

    // Paiements non validés de ce revendeur, datés de ce jour ou avant
    const paiementsTmp = await PaiementTmp.findAll({
      where: {
        is_sync: false,
        date: { [Op.lte]: date_sync }
      },
      include: [{
        model: VenteTmp,
        as: 'vente',
        where: { user: rev.id_user },
        attributes: ['id', 'id_vente_officielle']
      }],
      order: [['date', 'ASC'], ['id', 'ASC']],
      transaction: t
    });

    if (!ventesTmp.length && !paiementsTmp.length) {
      await t.rollback();
      return afficherPage(res, {
        result: { clients: 0, ventes: 0, paiements: 0, message: 'Aucune donnée à synchroniser pour cette date.' }
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
    const venteOfficielleParTmp = {}; // id_vente_tmp → id_vente réel (ventes validées maintenant)
    let ventesSynced = 0;

    for (const vt of ventesTmp) {
      const realClientId = clientIdMap[vt.id_client];
      if (!realClientId) continue;

      const newVente = await Vente.create({
        uuid: vt.uuid || null,
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

      venteOfficielleParTmp[vt.id] = newVente.id;
      ventesSynced++;

      await VenteTmp.update(
        { is_sync: true, id_vente_officielle: newVente.id },
        { where: { id: vt.id }, transaction: t }
      );
    }

    // ── 3. Insertion des paiements ─────────────────────────────────────────────
    // Le revendeur encaisse lui-même ses ventes : id_user = revendeur.
    let paiementsSynced = 0;
    let paiementsEnAttente = 0; // vente pas encore validée (autre date) : on attend
    const ventesTouchees = new Set();

    for (const pt of paiementsTmp) {
      const realVenteId = venteOfficielleParTmp[pt.id_vente] || pt.vente.id_vente_officielle;
      if (!realVenteId) {
        paiementsEnAttente++;
        continue;
      }

      await Paiement.create({
        uuid: pt.uuid || null,
        montant: pt.montant,
        date: pt.date,
        id_vente: realVenteId,
        id_user: rev.id_user,
        observation: pt.observation || null
      }, { transaction: t });

      paiementsSynced++;
      ventesTouchees.add(realVenteId);

      await PaiementTmp.update(
        { is_sync: true },
        { where: { id: pt.id }, transaction: t }
      );
    }

    // Vente soldée → type_paiement 'total' (comme à la caisse)
    for (const idVente of ventesTouchees) {
      const vente = await Vente.findByPk(idVente, { transaction: t });
      if (!vente || vente.type_paiement === 'total') continue;
      const totalPaye = (await Paiement.sum('montant', { where: { id_vente: idVente }, transaction: t })) || 0;
      if (totalPaye >= Number(vente.montant) - TOLERANCE) {
        await vente.update({ type_paiement: 'total' }, { transaction: t });
      }
    }

    await t.commit();

    return afficherPage(res, {
      result: {
        clients: clientsSynced,
        ventes: ventesSynced,
        paiements: paiementsSynced,
        paiementsEnAttente,
        revendeur: `${rev.prenom} ${rev.nom}`,
        date: date_sync,
        message: null
      }
    });
  } catch (err) {
    await t.rollback();
    console.error('[SyncData]', err);
    return afficherPage(res, { error: `Erreur lors de la synchronisation : ${err.message}` });
  }
};
