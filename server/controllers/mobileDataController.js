/**
 * Controller API mobile — Données (clients, ventes, paiements, sync)
 * Toutes les routes sont protégées par authJwt (profil revendeur).
 */
const db = require('../models');
const { Client, Vente, Paiement, Revendeur, ClientTmp, VenteTmp, PaiementTmp, ClientClientTmp, sequelize } = db;
const { Op } = require('sequelize');
const { aujourdhui } = require('../services/rapport/periode'); // date du jour à Niamey ('AAAA-MM-JJ')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayRange() {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

function isSameDay(date) {
  const { today, tomorrow } = todayRange();
  const d = new Date(date);
  return d >= today && d < tomorrow;
}

// ─── Synchronisation par uuid ─────────────────────────────────────────────────
// Le téléphone donne un uuid à chaque client, vente et paiement à la saisie.
// Il sert à reconnaître un renvoi (anti-doublon) et suit l'opération jusqu'aux tables officielles.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESSAGE_MAJ_APP = 'Votre application est trop ancienne : mettez-la à jour avant de synchroniser.';
const TOLERANCE = 0.01; // écart toléré sur les montants (FLOAT)

const arrondi = (n) => Math.round(Number(n) * 100) / 100;
const estUuid = (valeur) => UUID_REGEX.test(String(valeur || ''));

// Données du revendeur pour le téléphone : clients, ventes et paiements avec leur uuid et leur état
// ('envoyee' = reçue par le serveur, 'validee' = intégrée dans les comptes par l'admin).
// Les ventes viennent des tables d'attente (_tmp), qui contiennent tout ce que le revendeur a envoyé.
async function donneesRevendeur(id_user) {
  const clientsOfficiels = await Client.findAll({
    where: { deletedAt: null },
    attributes: ['id', 'nom', 'prenom', 'telephone', 'adresse'],
    order: [['nom', 'ASC'], ['prenom', 'ASC']],
    raw: true,
  });

  const ventesTmp = await VenteTmp.findAll({
    where: { user: id_user },
    include: [{
      model: PaiementTmp,
      as: 'Paiements',
      attributes: ['id', 'uuid', 'montant', 'date', 'id_vente', 'observation', 'is_sync', 'createdAt', 'updatedAt'],
    }],
    order: [['date_vente', 'DESC'], ['id', 'DESC']],
  });

  // Clients saisis sur un téléphone (id > 10000 dans clients_tmp) : après validation,
  // client_client_tmp les relie au client officiel, qui garde l'uuid du téléphone.
  const liens = await ClientClientTmp.findAll({ attributes: ['id_client_tmp', 'id_client'], raw: true });
  const officielParTmp = new Map(liens.map((l) => [l.id_client_tmp, l.id_client]));
  const idsClientsTmp = [...new Set([
    ...liens.map((l) => l.id_client_tmp),
    ...ventesTmp.map((v) => v.id_client).filter((id) => id > 10000),
  ])];
  const clientsTmp = idsClientsTmp.length
    ? await ClientTmp.findAll({
        where: { id: idsClientsTmp },
        attributes: ['id', 'uuid', 'nom', 'prenom', 'telephone', 'adresse'],
        raw: true,
      })
    : [];
  const uuidParOfficiel = new Map();
  for (const ct of clientsTmp) {
    const idOfficiel = officielParTmp.get(ct.id);
    if (idOfficiel && ct.uuid) uuidParOfficiel.set(idOfficiel, ct.uuid);
  }

  // id du client vu par le téléphone : officiel si validé, sinon celui de clients_tmp
  const idClientPourTelephone = (idTmp) => (idTmp > 10000 ? officielParTmp.get(idTmp) || idTmp : idTmp);

  const clientsEnAttente = clientsTmp
    .filter((ct) => !officielParTmp.has(ct.id) && ventesTmp.some((v) => v.id_client === ct.id))
    .map((ct) => ({ ...ct, uuid: ct.uuid || null }));

  const clients = [
    ...clientsOfficiels.map((c) => ({ ...c, uuid: uuidParOfficiel.get(c.id) || null })),
    ...clientsEnAttente,
  ];

  const ventes = ventesTmp.map((v) => ({
    id: v.id,
    uuid: v.uuid,
    type_vente: v.type_vente,
    quantite: v.quantite,
    observation: v.observation,
    type_paiement: v.type_paiement,
    montant: v.montant,
    prix_unitaire: v.prix_unitaire,
    date_vente: v.date_vente,
    id_client: idClientPourTelephone(v.id_client),
    user: v.user,
    statut: v.is_sync ? 'validee' : 'envoyee',
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));

  const paiements = ventesTmp.flatMap((v) => (v.Paiements || []).map((p) => ({
    id: p.id,
    uuid: p.uuid,
    montant: p.montant,
    date: p.date,
    id_vente: v.id,
    vente_uuid: v.uuid,
    observation: p.observation,
    statut: p.is_sync ? 'validee' : 'envoyee',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  })));

  return { clients, ventes, paiements };
}

// ─── GET /api/mobile/bootstrap ────────────────────────────────────────────────
// Charge initiale : mêmes données que /restore (le téléphone fusionne par uuid)
exports.bootstrap = async (req, res) => {
  try {
    const data = await donneesRevendeur(req.apiUser.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Mobile] bootstrap :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── GET /api/mobile/clients ──────────────────────────────────────────────────
// Retourne tous les clients actifs (pour sync au démarrage)
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.findAll({
      where: { deletedAt: null },
      attributes: ['id', 'nom', 'prenom', 'telephone', 'adresse'],
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
    return res.json({ success: true, clients });
  } catch (err) {
    console.error('[Mobile] getClients :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── POST /api/mobile/clients ─────────────────────────────────────────────────
// Créer un client (par le revendeur)
exports.createClient = async (req, res) => {
  const { nom, prenom, telephone, adresse } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ success: false, message: 'Nom et prénom obligatoires.' });
  }
  try {
    const client = await Client.create({ nom, prenom, telephone: telephone || null, adresse: adresse || null });
    return res.status(201).json({ success: true, message: 'Client créé.', client });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé.' });
    }
    console.error('[Mobile] createClient :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── PUT /api/mobile/clients/:id ─────────────────────────────────────────────
// Modifier un client — uniquement si créé par ce revendeur (cree_par_revendeur)
// Côté serveur on ne peut pas vérifier "créé par ce revendeur", on autorise si
// la vente liée appartient à ce revendeur, sinon on bloque.
// Simplification : on autorise si le client n'a aucune vente d'un autre revendeur.
exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, adresse } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ success: false, message: 'Nom et prénom obligatoires.' });
  }
  try {
    const client = await Client.findByPk(id);
    if (!client || client.deletedAt) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }
    await client.update({ nom, prenom, telephone: telephone || null, adresse: adresse || null });
    return res.json({ success: true, message: 'Client mis à jour.', client });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé.' });
    }
    console.error('[Mobile] updateClient :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── DELETE /api/mobile/clients/:id ──────────────────────────────────────────
// Suppression logique — uniquement si aucune vente associée
exports.deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const client = await Client.findByPk(id);
    if (!client || client.deletedAt) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }
    // Vérifier qu'il n'a aucune vente
    const nbVentes = await Vente.count({ where: { id_client: id } });
    if (nbVentes > 0) {
      return res.status(409).json({ success: false, message: 'Impossible de supprimer : ce client a des ventes associées.' });
    }
    await client.update({ deletedAt: new Date(), deletedBy: req.apiUser.login });
    return res.json({ success: true, message: 'Client supprimé.' });
  } catch (err) {
    console.error('[Mobile] deleteClient :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── GET /api/mobile/redevables ──────────────────────────────────────────────
// Retourne les ventes non soldées du revendeur connecté
exports.getRedevables = async (req, res) => {
  try {
    const id_user = req.apiUser.id;
    const ventes = await Vente.findAll({
      where: { user: id_user, type_paiement: 'echellonner' },
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['id', 'montant', 'date'] }
      ],
      order: [['date_vente', 'DESC']]
    });

    const data = ventes
      .map(v => {
        const montantTotal = v.quantite * v.prix_unitaire;
        const montantPayes = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
        const reste = montantTotal - montantPayes;
        return { ...v.toJSON(), montantTotal, montantPayes, reste };
      })
      .filter(v => v.reste > 0);

    return res.json({ success: true, ventes: data });
  } catch (err) {
    console.error('[Mobile] getRedevables :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── POST /api/mobile/ventes ──────────────────────────────────────────────────
// Créer une vente
exports.createVente = async (req, res) => {
  const { id_client, quantite, prix_unitaire, type_paiement, montant_paye, observation, date_vente } = req.body;
  const id_user = req.apiUser.id;

  if (!id_client || !quantite || !prix_unitaire || !type_paiement) {
    return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
  }

  const montant = quantite * prix_unitaire;
  const paye    = Number(montant_paye) || 0;

  if (paye > montant) {
    return res.status(400).json({ success: false, message: 'Le montant payé ne peut pas dépasser le total.' });
  }

  const t = await sequelize.transaction();
  try {
    const vente = await Vente.create({
      type_vente:    'livrer',
      quantite:      Number(quantite),
      prix_unitaire: Number(prix_unitaire),
      montant,
      type_paiement: paye >= montant ? 'total' : 'echellonner',
      date_vente:    date_vente || aujourdhui(),
      id_client:     Number(id_client),
      user:          id_user,
      observation:   observation || null
    }, { transaction: t });

    // Créer le paiement si montant payé > 0
    if (paye > 0) {
      await Paiement.create({
        id_vente:    vente.id,
        montant:     paye,
        date:        date_vente || aujourdhui(),
        id_user,
        observation: null
      }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json({ success: true, message: 'Vente enregistrée.', vente });
  } catch (err) {
    await t.rollback();
    console.error('[Mobile] createVente :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── PUT /api/mobile/ventes/:id ──────────────────────────────────────────────
// Modifier une vente — désactivé : une vente n'est jamais modifiée ni supprimée.
// Aucun appel depuis l'application revendeur. Route commentée dans routes/api/mobile.js.
/*
exports.updateVente = async (req, res) => {
  const { id } = req.params;
  const id_user = req.apiUser.id;
  const { quantite, prix_unitaire, type_paiement, observation } = req.body;

  try {
    const vente = await Vente.findByPk(id);
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    if (vente.user !== id_user) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    if (!isSameDay(vente.date_vente)) {
      return res.status(403).json({ success: false, message: 'Modification impossible après la journée de vente.' });
    }

    const montant = (quantite || vente.quantite) * (prix_unitaire || vente.prix_unitaire);
    await vente.update({
      quantite:      quantite      || vente.quantite,
      prix_unitaire: prix_unitaire || vente.prix_unitaire,
      montant,
      type_paiement: type_paiement || vente.type_paiement,
      observation:   observation   !== undefined ? observation : vente.observation
    });

    return res.json({ success: true, message: 'Vente modifiée.', vente });
  } catch (err) {
    console.error('[Mobile] updateVente :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
*/

// ─── DELETE /api/mobile/ventes/:id ───────────────────────────────────────────
// Supprimer une vente — désactivé : une vente n'est jamais modifiée ni supprimée.
// Aucun appel depuis l'application revendeur. Route commentée dans routes/api/mobile.js.
/*
exports.deleteVente = async (req, res) => {
  const { id } = req.params;
  const id_user = req.apiUser.id;

  try {
    const vente = await Vente.findByPk(id);
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    if (vente.user !== id_user) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    if (!isSameDay(vente.date_vente)) {
      return res.status(403).json({ success: false, message: 'Suppression impossible après la journée de vente.' });
    }

    // Supprimer les paiements liés
    await Paiement.destroy({ where: { id_vente: vente.id } });
    await vente.destroy();

    return res.json({ success: true, message: 'Vente supprimée.' });
  } catch (err) {
    console.error('[Mobile] deleteVente :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
*/

// ─── POST /api/mobile/paiements ──────────────────────────────────────────────
// Ajouter un paiement sur une vente (redevable)
exports.createPaiement = async (req, res) => {
  const { id_vente, montant, observation } = req.body;
  const id_user = req.apiUser.id;

  if (!id_vente || !montant) {
    return res.status(400).json({ success: false, message: 'id_vente et montant obligatoires.' });
  }

  try {
    const vente = await Vente.findByPk(id_vente, {
      include: [{ model: Paiement, attributes: ['montant'] }]
    });
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    if (vente.user !== id_user) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const montantTotal = vente.quantite * vente.prix_unitaire;
    const totalPaye    = vente.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
    const reste        = montantTotal - totalPaye;

    if (Number(montant) > reste) {
      return res.status(400).json({ success: false, message: `Le montant (${montant}) dépasse le reste à payer (${reste}).` });
    }

    const paiement = await Paiement.create({
      id_vente: vente.id,
      montant:  Number(montant),
      date:     aujourdhui(),
      id_user,
      observation: observation || null
    });

    // Si soldé, passer le type_paiement à 'total'
    const nouveauTotal = totalPaye + Number(montant);
    if (nouveauTotal >= montantTotal) {
      await vente.update({ type_paiement: 'total' });
    }

    return res.status(201).json({ success: true, message: 'Paiement enregistré.', paiement });
  } catch (err) {
    console.error('[Mobile] createPaiement :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── POST /api/mobile/sync ───────────────────────────────────────────────────
// Reçoit les données offline du revendeur et les enregistre en tables temporaires.
// Chaque élément porte un uuid : un élément déjà reçu n'est pas recréé (renvoi après coupure réseau),
// deux ventes identiques avec des uuid différents sont bien deux ventes.
// Un paiement désigne sa vente par vente_uuid. Envoi sans uuid (ancienne application) : refusé.
// Réponse : resultats.acceptes = uuid reçus (nouveaux ou déjà reçus), le téléphone les retire de sa file.
exports.sync = async (req, res) => {
  const { clients = [], ventes = [], paiements = [] } = req.body;
  const id_user = req.apiUser.id;

  if (![clients, ventes, paiements].every(Array.isArray)) {
    return res.status(400).json({ success: false, message: 'Données de synchronisation invalides.' });
  }
  const sansUuid = [...clients, ...ventes, ...paiements].some((e) => !estUuid(e?.uuid))
    || paiements.some((p) => !estUuid(p.vente_uuid))
    || ventes.some((v) => v.client_uuid && !estUuid(v.client_uuid));
  if (sansUuid) {
    return res.status(426).json({ success: false, message: MESSAGE_MAJ_APP });
  }

  const resultats = {
    clients: 0, ventes: 0, paiements: 0, // nouveaux éléments enregistrés
    deja_recus: 0,
    acceptes: { clients: [], ventes: [], paiements: [] },
    erreurs: [],
  };

  const t = await sequelize.transaction();

  try {
    let nextOfflineClientTmpId = null;

    const getNextOfflineClientTmpId = async () => {
      if (nextOfflineClientTmpId !== null) {
        nextOfflineClientTmpId += 1;
        return nextOfflineClientTmpId;
      }

      const currentMaxId = await ClientTmp.max('id', { transaction: t });
      const base = Math.max(Number(currentMaxId) || 0, 10000);
      nextOfflineClientTmpId = base + 1;
      return nextOfflineClientTmpId;
    };

    // Client officiel : copie dans clients_tmp avec le même id (≤ 10000)
    const ensureClientTmpFromServer = async (clientId) => {
      if (!clientId) return null;
      let tmpClient = await ClientTmp.findByPk(clientId, { transaction: t });
      if (tmpClient) return tmpClient;

      const sourceClient = await Client.findByPk(clientId, { transaction: t });
      if (!sourceClient) return null;

      tmpClient = await ClientTmp.create(
        {
          id: sourceClient.id,
          nom: sourceClient.nom,
          prenom: sourceClient.prenom,
          telephone: sourceClient.telephone || null,
          adresse: sourceClient.adresse || null,
        },
        { transaction: t }
      );
      return tmpClient;
    };

    // ── 1. Clients vers clients_tmp ──
    for (const c of clients) {
      try {
        const existant = await ClientTmp.findOne({ where: { uuid: c.uuid }, transaction: t });
        if (existant) {
          resultats.deja_recus++;
        } else {
          if (!c.nom || !c.prenom) throw new Error('nom et prénom obligatoires');
          await ClientTmp.create({
            id: await getNextOfflineClientTmpId(),
            uuid: c.uuid,
            nom: c.nom,
            prenom: c.prenom,
            telephone: c.telephone || null,
            adresse: c.adresse || null,
          }, { transaction: t });
          resultats.clients++;
        }
        resultats.acceptes.clients.push(c.uuid);
      } catch (e) {
        resultats.erreurs.push(`Client ${c.nom || ''} ${c.prenom || ''} : ${e.message}`);
      }
    }

    // ── 2. Ventes vers ventes_tmp ──
    for (const v of ventes) {
      try {
        const existante = await VenteTmp.findOne({ where: { uuid: v.uuid }, transaction: t });
        if (existante) {
          if (existante.user !== id_user) throw new Error('identifiant déjà utilisé par un autre revendeur');
          resultats.deja_recus++;
          resultats.acceptes.ventes.push(v.uuid);
          continue;
        }

        const quantite = Number(v.quantite);
        const prix = Number(v.prix_unitaire);
        if (!Number.isInteger(quantite) || quantite <= 0) throw new Error('quantité invalide');
        if (!(prix > 0)) throw new Error('prix invalide');
        if (!v.date_vente) throw new Error('date manquante');

        // Client : par son uuid (client saisi sur un téléphone) sinon par son id (client officiel)
        let clientTmp = null;
        if (v.client_uuid) {
          clientTmp = await ClientTmp.findOne({ where: { uuid: v.client_uuid }, transaction: t });
        } else if (v.id_client) {
          clientTmp = await ensureClientTmpFromServer(Number(v.id_client));
        }
        if (!clientTmp) throw new Error('client introuvable');

        await VenteTmp.create({
          uuid:          v.uuid,
          type_vente:    v.type_vente === 'livrer' ? 'livrer' : 'usine',
          quantite,
          prix_unitaire: prix,
          montant:       arrondi(quantite * prix),
          id_client:     clientTmp.id,
          type_paiement: v.type_paiement === 'echellonner' ? 'echellonner' : 'total',
          date_vente:    v.date_vente,
          user:          id_user,
          observation:   v.observation || null
        }, { transaction: t });
        resultats.ventes++;
        resultats.acceptes.ventes.push(v.uuid);
      } catch (e) {
        resultats.erreurs.push(`Vente du ${v.date_vente || '?'} (${v.quantite || '?'} sachets) : ${e.message}`);
      }
    }

    // ── 3. Paiements vers paiements_tmp ──
    for (const p of paiements) {
      try {
        const existant = await PaiementTmp.findOne({ where: { uuid: p.uuid }, transaction: t });
        if (existant) {
          resultats.deja_recus++;
          resultats.acceptes.paiements.push(p.uuid);
          continue;
        }

        const montant = arrondi(p.montant);
        if (!(montant > 0)) throw new Error('montant invalide');

        const venteTmp = await VenteTmp.findOne({ where: { uuid: p.vente_uuid }, transaction: t });
        if (!venteTmp || venteTmp.user !== id_user) throw new Error('vente introuvable');

        const dejaPaye = (await PaiementTmp.sum('montant', { where: { id_vente: venteTmp.id }, transaction: t })) || 0;
        const reste = arrondi(Number(venteTmp.montant) - dejaPaye);
        if (montant > reste + TOLERANCE) throw new Error(`dépasse le reste à payer (${reste} F)`);

        await PaiementTmp.create({
          uuid:        p.uuid,
          id_vente:    venteTmp.id,
          montant,
          date:        p.date || aujourdhui(),
          observation: p.observation || null
        }, { transaction: t });
        resultats.paiements++;
        resultats.acceptes.paiements.push(p.uuid);
      } catch (e) {
        resultats.erreurs.push(`Versement de ${p.montant || '?'} F du ${p.date || '?'} : ${e.message}`);
      }
    }

    await t.commit();
    return res.json({ success: true, message: 'Synchronisation réussie.', resultats });
  } catch (err) {
    await t.rollback();
    console.error('[Mobile] sync :', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la synchronisation.', error: err.message });
  }
};

// ─── GET /api/mobile/recette/jour ────────────────────────────────────────────
exports.recetteJour = async (req, res) => {
  try {
    const id_user = req.apiUser.id;
    const { today, tomorrow } = todayRange();

    const revendeur = await Revendeur.findOne({ where: { id_user, deletedAt: null } });

    const ventes = await VenteTmp.findAll({
      where: { user: id_user, date_vente: { [Op.between]: [today, tomorrow] } },
      include: [
        { model: ClientTmp, as: 'Client', attributes: ['id', 'nom', 'prenom'] },
        { model: PaiementTmp, as: 'Paiements', attributes: ['montant'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const data = _buildRecetteData(ventes, revendeur?.gain_par_sachet || 0);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Mobile] recetteJour :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── GET /api/mobile/recette/periode?date_debut=&date_fin= ───────────────────
exports.recettePeriode = async (req, res) => {
  try {
    const id_user = req.apiUser.id;
    const { date_debut, date_fin } = req.query;

    if (!date_debut || !date_fin) {
      return res.status(400).json({ success: false, message: 'date_debut et date_fin requis.' });
    }

    const revendeur = await Revendeur.findOne({ where: { id_user, deletedAt: null } });

    const ventes = await VenteTmp.findAll({
      where: {
        user: id_user,
        date_vente: { [Op.between]: [new Date(date_debut), new Date(date_fin)] }
      },
      include: [
        { model: ClientTmp, as: 'Client', attributes: ['id', 'nom', 'prenom'] },
        { model: PaiementTmp, as: 'Paiements', attributes: ['montant'] }
      ],
      order: [['date_vente', 'DESC']]
    });

    const data = _buildRecetteData(ventes, revendeur?.gain_par_sachet || 0);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Mobile] recettePeriode :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── Helper calcul recette ────────────────────────────────────────────────────
function _buildRecetteData(ventes, gainParSachet) {
  let totalVente = 0, totalEncaisse = 0, totalReste = 0, totalQte = 0;

  const ventesData = ventes.map(v => {
    const montantTotal  = v.quantite * v.prix_unitaire;
    const montantPayes  = v.Paiements?.reduce((s, p) => s + p.montant, 0) || 0;
    const reste         = montantTotal - montantPayes;
    totalVente     += montantTotal;
    totalEncaisse  += montantPayes;
    totalReste     += reste;
    totalQte       += v.quantite;
    return { ...v.toJSON(), montantTotal, montantPayes, reste };
  });

  const gainRevendeur = totalQte * Number(gainParSachet);

  return {
    ventes: ventesData,
    totaux: { totalVente, totalEncaisse, totalReste, totalQte, gainRevendeur }
  };
}

// ─── GET /api/mobile/restore ──────────────────────────────────────────────────
// Récupère clients + ventes + paiements du revendeur (avec uuid et état).
// Utilisé à la connexion, par « Mise à jour » et après chaque synchronisation :
// le téléphone remplace ses copies déjà envoyées par celles du serveur.
exports.restore = async (req, res) => {
  try {
    const data = await donneesRevendeur(req.apiUser.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Mobile] restore :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
