import type {
  LocalClient,
  LocalPaiement,
  LocalVente,
  PendingClientPayload,
  PendingPaiementPayload,
  PendingVentePayload,
} from '@/types/data';

const CLIENTS_KEY = 'bamti.revendeur.data.clients';
const VENTES_KEY = 'bamti.revendeur.data.ventes';
const PAIEMENTS_KEY = 'bamti.revendeur.data.paiements';
const PENDING_CLIENTS_KEY = 'bamti.revendeur.pending.clients';
const PENDING_VENTES_KEY = 'bamti.revendeur.pending.ventes';
const PENDING_PAIEMENTS_KEY = 'bamti.revendeur.pending.paiements';

function readJson<T>(key: string, fallback: T): T {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch (_error) {
    localStorage.removeItem(key);
    return fallback;
  }
}

export const localDataStorage = {
  saveClients(clients: LocalClient[]): void {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },

  saveVentes(ventes: LocalVente[]): void {
    localStorage.setItem(VENTES_KEY, JSON.stringify(ventes));
  },

  savePaiements(paiements: LocalPaiement[]): void {
    localStorage.setItem(PAIEMENTS_KEY, JSON.stringify(paiements));
  },

  getClients(): LocalClient[] {
    return readJson<LocalClient[]>(CLIENTS_KEY, []);
  },

  getVentes(): LocalVente[] {
    return readJson<LocalVente[]>(VENTES_KEY, []);
  },

  getPaiements(): LocalPaiement[] {
    return readJson<LocalPaiement[]>(PAIEMENTS_KEY, []);
  },

  savePendingClients(clients: PendingClientPayload[]): void {
    localStorage.setItem(PENDING_CLIENTS_KEY, JSON.stringify(clients));
  },

  savePendingVentes(ventes: PendingVentePayload[]): void {
    localStorage.setItem(PENDING_VENTES_KEY, JSON.stringify(ventes));
  },

  savePendingPaiements(paiements: PendingPaiementPayload[]): void {
    localStorage.setItem(PENDING_PAIEMENTS_KEY, JSON.stringify(paiements));
  },

  getPendingClients(): PendingClientPayload[] {
    return readJson<PendingClientPayload[]>(PENDING_CLIENTS_KEY, []);
  },

  getPendingVentes(): PendingVentePayload[] {
    return readJson<PendingVentePayload[]>(PENDING_VENTES_KEY, []);
  },

  getPendingPaiements(): PendingPaiementPayload[] {
    return readJson<PendingPaiementPayload[]>(PENDING_PAIEMENTS_KEY, []);
  },

  clearPendingData(): void {
    localStorage.removeItem(PENDING_CLIENTS_KEY);
    localStorage.removeItem(PENDING_VENTES_KEY);
    localStorage.removeItem(PENDING_PAIEMENTS_KEY);
  },

  clearAllBusinessData(): void {
    localStorage.removeItem(CLIENTS_KEY);
    localStorage.removeItem(VENTES_KEY);
    localStorage.removeItem(PAIEMENTS_KEY);
  },
};
