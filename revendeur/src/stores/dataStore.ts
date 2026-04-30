import { reactive, toRaw } from 'vue';
import { mobileDataService } from '@/services/mobileDataService';
import { localDataStorage } from '@/services/localDataStorage';
import type {
  LocalClient,
  LocalPaiement,
  LocalVente,
  PendingClientPayload,
  PendingPaiementPayload,
  PendingVentePayload,
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

export const dataStore = {
  state,

  async hydrate(): Promise<void> {
    await loadFromLocal();
  },

  async restoreFromServer(token: string): Promise<{ clients: number; ventes: number; paiements: number }> {
    const response = await mobileDataService.restore(token);
    const { clients: serverClients, ventes: serverVentes, paiements: serverPaiements } = response.data;

    const localClientIds = new Set(state.clients.map((c) => c.id));
    const localVenteIds  = new Set(state.ventes.map((v) => v.id));
    const localPaiIds    = new Set(state.paiements.map((p) => p.id));

    const newClients   = serverClients.filter((c) => !localClientIds.has(c.id));
    const newVentes    = serverVentes.filter((v) => !localVenteIds.has(v.id));
    const newPaiements = serverPaiements.filter((p) => !localPaiIds.has(p.id));

    state.clients   = [...newClients,   ...state.clients];
    state.ventes    = [...newVentes,    ...state.ventes];
    state.paiements = [...newPaiements, ...state.paiements];

    await persistBusinessData();

    return { clients: newClients.length, ventes: newVentes.length, paiements: newPaiements.length };
  },

  async syncInitialData(token: string): Promise<void> {
    const response = await mobileDataService.bootstrap(token);
    const localClients = (await localDataStorage.getClients()).filter((item) => item.id < 0);
    const localVentes = (await localDataStorage.getVentes()).filter((item) => item.id < 0);
    const localPaiements = (await localDataStorage.getPaiements()).filter((item) => item.id < 0);

    await localDataStorage.saveClients([...response.data.clients, ...localClients]);
    await localDataStorage.saveVentes([...response.data.ventes, ...localVentes]);
    await localDataStorage.savePaiements([...response.data.paiements, ...localPaiements]);
    await loadFromLocal();
  },

  async addClientOffline(payload: {
    nom: string;
    prenom: string;
    telephone?: string;
    adresse?: string;
  }): Promise<LocalClient> {
    const client: LocalClient = {
      id: nextLocalId(),
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

    const vente: LocalVente = {
      id: venteId,
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

    const paiement: LocalPaiement = {
      id: nextLocalId(),
      montant: montantVerse,
      date: payload.date_vente,
      id_vente: venteId,
      observation: null,
      createdAt: now,
      updatedAt: now,
    };

    state.ventes = [vente, ...state.ventes];
    state.paiements = [paiement, ...state.paiements];

    state.pendingVentes = [
      ...state.pendingVentes,
      {
        id_local: vente.id,
        id_client_local: payload.client.id,
        id_client: payload.client.id > 0 ? payload.client.id : undefined,
        type_vente: payload.type_vente,
        quantite: vente.quantite,
        prix_unitaire: vente.prix_unitaire,
        type_paiement: vente.type_paiement,
        date_vente: vente.date_vente,
        observation: vente.observation,
      },
    ];
    state.pendingPaiements = [
      ...state.pendingPaiements,
      {
        id_local: paiement.id,
        id_vente_local: vente.id,
        id_vente: vente.id > 0 ? vente.id : undefined,
        montant: paiement.montant,
        date: paiement.date,
        observation: paiement.observation,
      },
    ];

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
        id_vente_local: vente.id,
        id_vente: vente.id > 0 ? vente.id : undefined,
        montant: paiement.montant,
        date: paiement.date,
        observation: paiement.observation,
      },
    ];

    await persistBusinessData();
    await persistPendingData();
  },

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

    const clientsToSync = [...state.pendingClients];
    const ventesToSync = [...state.pendingVentes];
    const paiementsToSync = [...state.pendingPaiements];

    for (const paiement of paiementsToSync) {
      const hasMappedVente = ventesToSync.some((vente) => vente.id_local === paiement.id_vente_local);
      if (hasMappedVente || paiement.id_vente || paiement.id_vente_local > 0) {
        continue;
      }

      const localVente = state.ventes.find((vente) => vente.id === paiement.id_vente_local);
      if (!localVente) {
        continue;
      }

      const ventePayload: PendingVentePayload = {
        id_local: localVente.id,
        id_client_local: localVente.id_client,
        id_client: localVente.id_client > 0 ? localVente.id_client : undefined,
        type_vente: localVente.type_vente,
        quantite: localVente.quantite,
        prix_unitaire: localVente.prix_unitaire,
        type_paiement: localVente.type_paiement,
        date_vente: localVente.date_vente,
        observation: localVente.observation,
      };

      ventesToSync.push(ventePayload);

      if (localVente.id_client < 0) {
        const hasClient = clientsToSync.some((client) => client.id_local === localVente.id_client);
        if (!hasClient) {
          const localClient = state.clients.find((client) => client.id === localVente.id_client);
          if (localClient) {
            clientsToSync.push({
              id_local: localClient.id,
              nom: localClient.nom,
              prenom: localClient.prenom,
              telephone: localClient.telephone,
              adresse: localClient.adresse,
            });
          }
        }
      }
    }

    const response = await mobileDataService.sync(token, {
      clients: clientsToSync,
      ventes: ventesToSync,
      paiements: paiementsToSync,
    });

    const errors = response.resultats.erreurs || [];
    if (!errors.length) {
      await localDataStorage.clearPendingData();
      state.pendingClients = [];
      state.pendingVentes = [];
      state.pendingPaiements = [];
    } else {
      state.pendingClients = clientsToSync;
      state.pendingVentes = ventesToSync;
      state.pendingPaiements = paiementsToSync;
      await persistPendingData();
    }

    return {
      synced: response.resultats.clients + response.resultats.ventes + response.resultats.paiements,
      errors,
    };
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
