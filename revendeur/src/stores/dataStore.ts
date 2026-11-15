import { reactive, toRaw } from 'vue';
import { mobileDataService } from '@/services/mobileDataService';
import { localDataStorage } from '@/services/localDataStorage';
import { genererUuid } from '@/services/uuid';
import type {
  LocalClient,
  LocalPaiement,
  LocalVente,
  PendingClientPayload,
  PendingPaiementPayload,
  PendingVentePayload,
  SyncPayload,
} from '@/types/data';

interface DataState {
  clients: LocalClient[];
  ventes: LocalVente[];
  paiements: LocalPaiement[];
  pendingClients: PendingClientPayload[];
  pendingVentes: PendingVentePayload[];
  pendingPaiements: PendingPaiementPayload[];
}

const state = reactive<DataState>({
  clients: [],
  ventes: [],
  paiements: [],
  pendingClients: [],
  pendingVentes: [],
  pendingPaiements: [],
});

function nextLocalId(): number {
  return -Math.floor(Date.now() + Math.random() * 1000);
}

function totalPaidForVente(venteId: number): number {
  return state.paiements
    .filter((paiement) => paiement.id_vente === venteId)
    .reduce((sum, paiement) => sum + Number(paiement.montant), 0);
}

async function loadFromLocal(): Promise<void> {
  state.clients = await localDataStorage.getClients();
  state.ventes = await localDataStorage.getVentes();
  state.paiements = await localDataStorage.getPaiements();
  state.pendingClients = await localDataStorage.getPendingClients();
  state.pendingVentes = await localDataStorage.getPendingVentes();
  state.pendingPaiements = await localDataStorage.getPendingPaiements();

  if (migrerVersUuid()) {
    await persistBusinessData();
    await persistPendingData();
  }
}

// Données saisies avec une ancienne version de l'application (sans uuid) :
// on donne un uuid à tout ce qui attend encore d'être envoyé. Les copies déjà envoyées
// seront remplacées par celles du serveur au prochain restoreFromServer.
// Retourne true si quelque chose a changé.
function migrerVersUuid(): boolean {
  let modifie = false;

  for (const pending of state.pendingClients) {
    const local = state.clients.find((client) => client.id === pending.id_local);
    const uuid = pending.uuid || local?.uuid || genererUuid();
    if (pending.uuid !== uuid) { pending.uuid = uuid; modifie = true; }
    if (local && local.uuid !== uuid) { local.uuid = uuid; modifie = true; }
  }

  for (const pending of state.pendingVentes) {
    const local = state.ventes.find((vente) => vente.id === pending.id_local);
    const uuid = pending.uuid || local?.uuid || genererUuid();
    if (pending.uuid !== uuid) { pending.uuid = uuid; modifie = true; }
    if (local && local.uuid !== uuid) { local.uuid = uuid; modifie = true; }
    if (local && !local.statut) { local.statut = 'telephone'; modifie = true; }

    if (pending.client_uuid === undefined) {
      const client = state.clients.find((item) => item.id === pending.id_client_local);
      pending.client_uuid = client?.uuid || null;
      if (local) local.client_uuid = pending.client_uuid;
      modifie = true;
    }
  }

  // Versements à 0 F créés par l'ancienne version : rien à envoyer
  const avant = state.pendingPaiements.length;
  state.pendingPaiements = state.pendingPaiements.filter((pending) => Number(pending.montant) > 0);
  if (state.pendingPaiements.length !== avant) modifie = true;

  for (const pending of state.pendingPaiements) {
    const local = state.paiements.find((paiement) => paiement.id === pending.id_local);
    const uuid = pending.uuid || local?.uuid || genererUuid();
    if (pending.uuid !== uuid) { pending.uuid = uuid; modifie = true; }
    if (local && local.uuid !== uuid) { local.uuid = uuid; modifie = true; }
    if (local && !local.statut) { local.statut = 'telephone'; modifie = true; }

    if (!pending.vente_uuid) {
      const vente = state.ventes.find((item) => item.id === pending.id_vente_local);
      if (vente?.uuid) {
        pending.vente_uuid = vente.uuid;
        if (local) local.vente_uuid = vente.uuid;
        modifie = true;
      }
    }
  }

  return modifie;
}

async function persistBusinessData(): Promise<void> {
  await localDataStorage.saveClients(state.clients.map(toRaw));
  await localDataStorage.saveVentes(state.ventes.map(toRaw));
  await localDataStorage.savePaiements(state.paiements.map(toRaw));
}

async function persistPendingData(): Promise<void> {
  await localDataStorage.savePendingClients(state.pendingClients.map(toRaw));
  await localDataStorage.savePendingVentes(state.pendingVentes.map(toRaw));
  await localDataStorage.savePendingPaiements(state.pendingPaiements.map(toRaw));
}

// Recharge depuis le serveur : les éléments déjà envoyés sont remplacés par la copie du serveur
// (un seul exemplaire, avec son état « envoyée » ou « validée ») ; seuls les éléments encore
// en attente d'envoi restent tels quels sur le téléphone. La correspondance se fait par uuid.
async function rechargerDepuisServeur(token: string): Promise<{ clients: number; ventes: number; paiements: number }> {
  const response = await mobileDataService.restore(token);
  // Toujours repartir du stockage local (ex. : à la connexion, la mémoire est encore vide) :
  // sinon la file d'attente serait écrasée et les ventes non envoyées perdues.
  await loadFromLocal();
  const serveur = response.data;

  // Ce que le téléphone connaissait déjà (pour compter les nouveautés)
  const clesConnues = new Set([
    ...state.clients.map((c) => c.uuid || `client:${c.id}`),
    ...state.ventes.map((v) => v.uuid || ''),
    ...state.paiements.map((p) => p.uuid || ''),
  ]);

  // Éléments en attente que le serveur a déjà (réponse perdue lors d'un envoi précédent) : retirés de la file
  const uuidsServeur = new Set(
    [...serveur.clients, ...serveur.ventes, ...serveur.paiements].map((e) => e.uuid).filter(Boolean)
  );
  state.pendingClients = state.pendingClients.filter((p) => !p.uuid || !uuidsServeur.has(p.uuid));
  state.pendingVentes = state.pendingVentes.filter((p) => !p.uuid || !uuidsServeur.has(p.uuid));
  state.pendingPaiements = state.pendingPaiements.filter((p) => !p.uuid || !uuidsServeur.has(p.uuid));

  const enAttente = new Set(
    [...state.pendingClients, ...state.pendingVentes, ...state.pendingPaiements].map((p) => p.uuid)
  );

  const clientsLocaux = state.clients.filter((c) => c.uuid && enAttente.has(c.uuid));
  const ventesLocales = state.ventes.filter((v) => v.uuid && enAttente.has(v.uuid));
  const paiementsLocaux = state.paiements.filter((p) => p.uuid && enAttente.has(p.uuid));

  const clients = [...clientsLocaux, ...serveur.clients];
  const ventes = [...ventesLocales, ...serveur.ventes];

  // Les éléments locaux pointent vers leur client / leur vente par uuid : on remet le bon id
  for (const vente of ventesLocales) {
    const client = vente.client_uuid ? clients.find((c) => c.uuid === vente.client_uuid) : null;
    if (client) vente.id_client = client.id;
  }
  for (const paiement of paiementsLocaux) {
    const vente = paiement.vente_uuid ? ventes.find((v) => v.uuid === paiement.vente_uuid) : null;
    if (vente) paiement.id_vente = vente.id;
  }

  state.clients = clients;
  state.ventes = ventes;
  state.paiements = [...paiementsLocaux, ...serveur.paiements];

  await persistBusinessData();
  await persistPendingData();

  return {
    clients: serveur.clients.filter((c) => !clesConnues.has(c.uuid || `client:${c.id}`)).length,
    ventes: serveur.ventes.filter((v) => !clesConnues.has(v.uuid || '')).length,
    paiements: serveur.paiements.filter((p) => !clesConnues.has(p.uuid || '')).length,
  };
}

export const dataStore = {
  state,

  async hydrate(): Promise<void> {
    await loadFromLocal();
  },

  async restoreFromServer(token: string): Promise<{ clients: number; ventes: number; paiements: number }> {
    return rechargerDepuisServeur(token);
  },

  // Chargement à l'ouverture de l'accueil : même fusion par uuid que restoreFromServer
  async syncInitialData(token: string): Promise<void> {
    await rechargerDepuisServeur(token);
  },

  async addClientOffline(payload: {
    nom: string;
    prenom: string;
    telephone?: string;
    adresse?: string;
  }): Promise<LocalClient> {
    const client: LocalClient = {
      id: nextLocalId(),
      uuid: genererUuid(),
      nom: payload.nom.trim(),
      prenom: payload.prenom.trim(),
      telephone: payload.telephone?.trim() || null,
      adresse: payload.adresse?.trim() || null,
    };

    state.clients = [client, ...state.clients];
    state.pendingClients = [
      ...state.pendingClients,
      {
        id_local: client.id,
        uuid: client.uuid as string,
        nom: client.nom,
        prenom: client.prenom,
        telephone: client.telephone,
        adresse: client.adresse,
      },
    ];
    await persistBusinessData();
    await persistPendingData();
    return client;
  },

  async addVenteOffline(payload: {
    userId: number;
    client: LocalClient;
    type_vente: 'livrer' | 'usine';
    quantite: number;
    prix_unitaire: number;
    type_paiement: 'total' | 'echellonner';
    date_vente: string;
    montant_verse?: number;
    observation?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const venteId = nextLocalId();
    const total = Number(payload.quantite) * Number(payload.prix_unitaire);
    const montantVerse =
      payload.type_paiement === 'total'
        ? total
        : Math.max(0, Number(payload.montant_verse || 0));

    if (payload.type_paiement === 'echellonner' && montantVerse > total) {
      throw new Error('Le montant verse ne peut pas depasser le montant total de la vente.');
    }

    // Client saisi sur un téléphone : désigné par son uuid ; client du guichet : par son id
    const clientUuid = payload.client.uuid || null;

    const vente: LocalVente = {
      id: venteId,
      uuid: genererUuid(),
      client_uuid: clientUuid,
      statut: 'telephone',
      type_vente: payload.type_vente,
      quantite: Number(payload.quantite),
      observation: payload.observation?.trim() || null,
      type_paiement: payload.type_paiement,
      montant: total,
      prix_unitaire: Number(payload.prix_unitaire),
      date_vente: payload.date_vente,
      id_client: payload.client.id,
      user: payload.userId,
      createdAt: now,
      updatedAt: now,
    };

    state.ventes = [vente, ...state.ventes];
    state.pendingVentes = [
      ...state.pendingVentes,
      {
        id_local: vente.id,
        uuid: vente.uuid as string,
        id_client_local: payload.client.id,
        id_client: payload.client.id > 0 ? payload.client.id : undefined,
        client_uuid: clientUuid,
        type_vente: payload.type_vente,
        quantite: vente.quantite,
        prix_unitaire: vente.prix_unitaire,
        type_paiement: vente.type_paiement,
        date_vente: vente.date_vente,
        observation: vente.observation,
      },
    ];

    // Versement à la vente (aucun versement à 0 F)
    if (montantVerse > 0) {
      const paiement: LocalPaiement = {
        id: nextLocalId(),
        uuid: genererUuid(),
        vente_uuid: vente.uuid,
        statut: 'telephone',
        montant: montantVerse,
        date: payload.date_vente,
        id_vente: venteId,
        observation: null,
        createdAt: now,
        updatedAt: now,
      };

      state.paiements = [paiement, ...state.paiements];
      state.pendingPaiements = [
        ...state.pendingPaiements,
        {
          id_local: paiement.id,
          uuid: paiement.uuid as string,
          id_vente_local: vente.id,
          vente_uuid: vente.uuid,
          montant: paiement.montant,
          date: paiement.date,
          observation: paiement.observation,
        },
      ];
    }

    await persistBusinessData();
    await persistPendingData();
  },

  async addPaiementOffline(payload: {
    venteId: number;
    montant: number;
    date: string;
    observation?: string;
  }): Promise<void> {
    const vente = state.ventes.find((item) => item.id === payload.venteId);
    if (!vente) {
      throw new Error('Vente introuvable.');
    }
    if (!vente.uuid) {
      throw new Error('Cette vente date d\'avant la mise a jour de l\'application : faites « Mise a jour » (avec internet) puis reessayez.');
    }

    const montant = Number(payload.montant);
    if (montant <= 0) {
      throw new Error('Le montant doit etre superieur a 0.');
    }

    const dejaPaye = totalPaidForVente(vente.id);
    const reste = Math.max(0, Number(vente.montant) - dejaPaye);
    if (montant > reste) {
      throw new Error(`Montant depasse. Reste a payer: ${reste}.`);
    }

    const now = new Date().toISOString();
    const paiement: LocalPaiement = {
      id: nextLocalId(),
      uuid: genererUuid(),
      vente_uuid: vente.uuid,
      statut: 'telephone',
      montant,
      date: payload.date,
      id_vente: vente.id,
      observation: payload.observation?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    state.paiements = [paiement, ...state.paiements];
    state.pendingPaiements = [
      ...state.pendingPaiements,
      {
        id_local: paiement.id,
        uuid: paiement.uuid as string,
        id_vente_local: vente.id,
        id_vente: vente.id > 0 ? vente.id : undefined,
        vente_uuid: vente.uuid,
        montant: paiement.montant,
        date: paiement.date,
        observation: paiement.observation,
      },
    ];

    await persistBusinessData();
    await persistPendingData();
  },

  // Envoie la file d'attente au serveur. Chaque élément porte son uuid : un renvoi ne crée pas de doublon.
  // Les éléments acceptés sortent de la file ; les refusés y restent avec le motif dans errors.
  async syncPendingData(token: string): Promise<{ synced: number; errors: string[] }> {
    if (!state.pendingClients.length && !state.pendingVentes.length && !state.pendingPaiements.length) {
      return { synced: 0, errors: [] };
    }

    const pendingClientIds = new Set(state.pendingClients.map((client) => client.id_local));
    const clientIdsWithVentes = new Set(
      state.pendingVentes
        .map((vente) => vente.id_client_local)
        .filter((id) => pendingClientIds.has(id))
    );
    const orphanClients = state.pendingClients.filter((client) => !clientIdsWithVentes.has(client.id_local));
    if (orphanClients.length) {
      const names = orphanClients.map((client) => `${client.nom} ${client.prenom}`.trim()).join(', ');
      throw new Error(
        `Synchronisation bloquee: chaque client hors ligne doit avoir au moins une vente. Client(s) concerne(s): ${names}.`
      );
    }

    // Versement saisi avec l'ancienne version sur une vente inconnue : impossible à rattacher
    const paiementsSansVente = state.pendingPaiements.filter((paiement) => !paiement.vente_uuid);

    const payload: SyncPayload = {
      clients: state.pendingClients.map((client) => ({
        uuid: client.uuid as string,
        nom: client.nom,
        prenom: client.prenom,
        telephone: client.telephone,
        adresse: client.adresse,
      })),
      ventes: state.pendingVentes.map((vente) => ({
        uuid: vente.uuid as string,
        ...(vente.client_uuid ? { client_uuid: vente.client_uuid } : { id_client: vente.id_client }),
        type_vente: vente.type_vente,
        quantite: vente.quantite,
        prix_unitaire: vente.prix_unitaire,
        type_paiement: vente.type_paiement,
        date_vente: vente.date_vente,
        observation: vente.observation,
      })),
      paiements: state.pendingPaiements
        .filter((paiement) => paiement.vente_uuid)
        .map((paiement) => ({
          uuid: paiement.uuid as string,
          vente_uuid: paiement.vente_uuid as string,
          montant: paiement.montant,
          date: paiement.date,
          observation: paiement.observation,
        })),
    };

    const response = await mobileDataService.sync(token, payload);
    const { acceptes } = response.resultats;
    const uuidsAcceptes = new Set([...acceptes.clients, ...acceptes.ventes, ...acceptes.paiements]);

    state.pendingClients = state.pendingClients.filter((p) => !p.uuid || !uuidsAcceptes.has(p.uuid));
    state.pendingVentes = state.pendingVentes.filter((p) => !p.uuid || !uuidsAcceptes.has(p.uuid));
    state.pendingPaiements = state.pendingPaiements.filter((p) => !p.uuid || !uuidsAcceptes.has(p.uuid));
    for (const vente of state.ventes) {
      if (vente.uuid && uuidsAcceptes.has(vente.uuid) && vente.statut === 'telephone') vente.statut = 'envoyee';
    }
    for (const paiement of state.paiements) {
      if (paiement.uuid && uuidsAcceptes.has(paiement.uuid) && paiement.statut === 'telephone') paiement.statut = 'envoyee';
    }
    await persistBusinessData();
    await persistPendingData();

    // Remplace les copies envoyées par celles du serveur (un seul exemplaire de chaque vente)
    try {
      await rechargerDepuisServeur(token);
    } catch (_error) {
      // Les données locales restent correctes ; la prochaine mise à jour s'en chargera.
    }

    const errors = [
      ...(response.resultats.erreurs || []),
      ...paiementsSansVente.map(
        (paiement) => `Versement de ${paiement.montant} F du ${paiement.date} : vente introuvable, a ressaisir.`
      ),
    ];

    return { synced: uuidsAcceptes.size, errors };
  },

  getPendingCount(): number {
    return state.pendingClients.length + state.pendingVentes.length + state.pendingPaiements.length;
  },

  getVentesByUser(userId: number): LocalVente[] {
    return state.ventes.filter((vente) => vente.user === userId);
  },

  getPaiementsByVente(venteId: number): LocalPaiement[] {
    return state.paiements.filter((paiement) => paiement.id_vente === venteId);
  },

  getRemainingAmount(venteId: number): number {
    const vente = state.ventes.find((item) => item.id === venteId);
    if (!vente) {
      return 0;
    }
    return Math.max(0, Number(vente.montant) - totalPaidForVente(venteId));
  },

  async clearLocalDevData(): Promise<void> {
    await localDataStorage.clearAllBusinessData();
    await localDataStorage.clearPendingData();
    await loadFromLocal();
  },

  async deleteClient(clientId: number, token?: string): Promise<void> {
    const hasLocalVente = state.ventes.some((vente) => vente.id_client === clientId);
    if (hasLocalVente) {
      throw new Error('Suppression impossible: ce client a des ventes en local.');
    }

    if (clientId > 0) {
      if (!token) {
        throw new Error('Connexion requise pour verifier et supprimer ce client sur le serveur.');
      }
      await mobileDataService.deleteClient(token, clientId);
    }

    state.clients = state.clients.filter((client) => client.id !== clientId);
    state.pendingClients = state.pendingClients.filter((client) => client.id_local !== clientId);
    await persistBusinessData();
    await persistPendingData();
  },
};
