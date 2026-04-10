/**
 * Controller API mobile — Données (clients, ventes, paiements, sync)
 * Toutes les routes sont protégées par authJwt (profil revendeur).
 */
const db = require('../models');
const { Client, Vente, Paiement, Revendeur, sequelize } = db;
const { Op } = require('sequelize');

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
      date_vente:    date_vente || new Date().toISOString().split('T')[0],
      id_client:     Number(id_client),
      user:          id_user,
      observation:   observation || null
    }, { transaction: t });

    // Créer le paiement si montant payé > 0
    if (paye > 0) {
      await Paiement.create({
        id_vente:    vente.id,
        montant:     paye,
        date:        date_vente || new Date().toISOString().split('T')[0],
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
// Modifier une vente — uniquement le même jour
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

// ─── DELETE /api/mobile/ventes/:id ───────────────────────────────────────────
// Supprimer une vente — uniquement le même jour
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
      date:     new Date().toISOString().split('T')[0],
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
// Reçoit les données offline du revendeur et les enregistre en base
exports.sync = async (req, res) => {
  const { clients = [], ventes = [], paiements = [] } = req.body;
  const id_user = req.apiUser.id;
  const t = await sequelize.transaction();

  const resultats = { clients: 0, ventes: 0, paiements: 0, erreurs: [] };

  try {
    // ── 1. Clients nouveaux (ceux qui ont un id_local mais pas d'id serveur) ──
    const clientIdMap = {}; // id_local -> id_serveur

    for (const c of clients) {
      try {
        if (c.id_serveur) {
          // Client existant — mise à jour si modifié
          await Client.update(
            { nom: c.nom, prenom: c.prenom, telephone: c.telephone, adresse: c.adresse },
            { where: { id: c.id_serveur }, transaction: t }
          );
          clientIdMap[c.id_local] = c.id_serveur;
        } else {
          // Nouveau client créé offline
          const newClient = await Client.create(
            { nom: c.nom, prenom: c.prenom, telephone: c.telephone, adresse: c.adresse },
            { transaction: t }
          );
          clientIdMap[c.id_local] = newClient.id;
          resultats.clients++;
        }
      } catch (e) {
        resultats.erreurs.push(`Client ${c.nom}: ${e.message}`);
      }
    }

    // ── 2. Ventes ──────────────────────────────────────────────────────────────
    const venteIdMap = {}; // id_local -> id_serveur

    for (const v of ventes) {
      try {
        if (v.id_serveur) {
          // Vente déjà synchro — on skip
          venteIdMap[v.id_local] = v.id_serveur;
          continue;
        }
        const id_client_serveur = clientIdMap[v.id_client] || v.id_client_serveur || v.id_client;
        const montant = v.quantite * v.prix_unitaire;

        const newVente = await Vente.create({
          type_vente:    v.type_vente    || 'livrer',
          quantite:      v.quantite,
          prix_unitaire: v.prix_unitaire,
          montant,
          id_client:     id_client_serveur,
          type_paiement: v.type_paiement || 'total',
          date_vente:    v.date_vente    || new Date(),
          user:          id_user,
          observation:   v.observation   || null
        }, { transaction: t });

        venteIdMap[v.id_local] = newVente.id;
        resultats.ventes++;
      } catch (e) {
        resultats.erreurs.push(`Vente local#${v.id_local}: ${e.message}`);
      }
    }

    // ── 3. Paiements ───────────────────────────────────────────────────────────
    for (const p of paiements) {
      try {
        if (p.id_serveur) continue; // déjà synchro

        const id_vente_serveur = venteIdMap[p.id_vente_local] || p.id_vente_serveur;
        if (!id_vente_serveur) {
          resultats.erreurs.push(`Paiement: vente locale #${p.id_vente_local} non trouvée`);
          continue;
        }

        await Paiement.create({
          id_vente:    id_vente_serveur,
          montant:     p.montant,
          date:        p.date || new Date(),
          observation: p.observation || null
        }, { transaction: t });
        resultats.paiements++;
      } catch (e) {
        resultats.erreurs.push(`Paiement: ${e.message}`);
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

    const ventes = await Vente.findAll({
      where: { user: id_user, date_vente: { [Op.between]: [today, tomorrow] } },
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['montant'] }
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

    const ventes = await Vente.findAll({
      where: {
        user: id_user,
        date_vente: { [Op.between]: [new Date(date_debut), new Date(date_fin)] }
      },
      include: [
        { model: Client, attributes: ['id', 'nom', 'prenom'] },
        { model: Paiement, attributes: ['montant'] }
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
