import Dexie, { type Table } from 'dexie';
import type {
  LocalClient,
  LocalPaiement,
  LocalVente,
  PendingClientPayload,
  PendingPaiementPayload,
  PendingVentePayload,
} from '@/types/data';

class BamtiDatabase extends Dexie {
  clients!: Table<LocalClient, number>;
  ventes!: Table<LocalVente, number>;
  paiements!: Table<LocalPaiement, number>;
  pending_clients!: Table<PendingClientPayload, number>;
  pending_ventes!: Table<PendingVentePayload, number>;
  pending_paiements!: Table<PendingPaiementPayload, number>;

  constructor() {
    super('bamti_revendeur');
    this.version(1).stores({
      clients: 'id, nom, prenom',
      ventes: 'id, id_client, user',
      paiements: 'id, id_vente',
      pending_clients: 'id_local',
      pending_ventes: 'id_local, id_client_local',
      pending_paiements: 'id_local, id_vente_local',
    });
  }
}

export const db = new BamtiDatabase();
