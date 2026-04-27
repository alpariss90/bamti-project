import type {
  LocalClient,
  LocalPaiement,
  LocalVente,
  PendingClientPayload,
  PendingPaiementPayload,
  PendingVentePayload,
} from '@/types/data';
import { db } from './db';

export const localDataStorage = {
  async saveClients(clients: LocalClient[]): Promise<void> {
    await db.transaction('rw', db.clients, async () => {
      await db.clients.clear();
      if (clients.length) await db.clients.bulkAdd(clients);
    });
  },

  async saveVentes(ventes: LocalVente[]): Promise<void> {
    await db.transaction('rw', db.ventes, async () => {
      await db.ventes.clear();
      if (ventes.length) await db.ventes.bulkAdd(ventes);
    });
  },

  async savePaiements(paiements: LocalPaiement[]): Promise<void> {
    await db.transaction('rw', db.paiements, async () => {
      await db.paiements.clear();
      if (paiements.length) await db.paiements.bulkAdd(paiements);
    });
  },

  async getClients(): Promise<LocalClient[]> {
    return db.clients.toArray();
  },

  async getVentes(): Promise<LocalVente[]> {
    return db.ventes.toArray();
  },

  async getPaiements(): Promise<LocalPaiement[]> {
    return db.paiements.toArray();
  },

  async savePendingClients(clients: PendingClientPayload[]): Promise<void> {
    await db.transaction('rw', db.pending_clients, async () => {
      await db.pending_clients.clear();
      if (clients.length) await db.pending_clients.bulkAdd(clients);
    });
  },

  async savePendingVentes(ventes: PendingVentePayload[]): Promise<void> {
    await db.transaction('rw', db.pending_ventes, async () => {
      await db.pending_ventes.clear();
      if (ventes.length) await db.pending_ventes.bulkAdd(ventes);
    });
  },

  async savePendingPaiements(paiements: PendingPaiementPayload[]): Promise<void> {
    await db.transaction('rw', db.pending_paiements, async () => {
      await db.pending_paiements.clear();
      if (paiements.length) await db.pending_paiements.bulkAdd(paiements);
    });
  },

  async getPendingClients(): Promise<PendingClientPayload[]> {
    return db.pending_clients.toArray();
  },

  async getPendingVentes(): Promise<PendingVentePayload[]> {
    return db.pending_ventes.toArray();
  },

  async getPendingPaiements(): Promise<PendingPaiementPayload[]> {
    return db.pending_paiements.toArray();
  },

  async clearPendingData(): Promise<void> {
    await Promise.all([
      db.pending_clients.clear(),
      db.pending_ventes.clear(),
      db.pending_paiements.clear(),
    ]);
  },

  async clearAllBusinessData(): Promise<void> {
    await Promise.all([
      db.clients.clear(),
      db.ventes.clear(),
      db.paiements.clear(),
    ]);
  },
};
