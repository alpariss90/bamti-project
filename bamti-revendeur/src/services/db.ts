/**
 * Base de données locale — Dexie.js (IndexedDB)
 * Stocke : clients, ventes, paiements
 * Fonctionne entièrement offline
 */
import Dexie, { type Table } from 'dexie';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocalClient {
  id_local?: number;           // clé auto locale
  id_serveur: number | null;   // null = créé offline, pas encore synchro
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
  cree_par_revendeur: boolean; // true = créé par ce revendeur (modifiable/supprimable)
  modifie: boolean;            // true = modifié offline, à synchro
  synced: boolean;
  deletedAt?: string | null;   // suppression logique offline
}

export interface LocalVente {
  id_local?: number;
  id_serveur: number | null;
  id_client: number;           // id_local du client
  id_client_serveur: number | null;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  type_paiement: 'total' | 'echellonner';
  montant_paye: number;        // montant encaissé lors de la vente
  date_vente: string;          // YYYY-MM-DD
  observation: string | null;
  synced: boolean;
  date_created: string;        // pour filtrage journalier
}

export interface LocalPaiement {
  id_local?: number;
  id_serveur: number | null;
  id_vente_local: number;
  id_vente_serveur: number | null;
  montant: number;
  date: string;
  observation: string | null;
  synced: boolean;
}

// ── Classe Dexie ──────────────────────────────────────────────────────────────

class BamtiDB extends Dexie {
  clients!:   Table<LocalClient,   number>;
  ventes!:    Table<LocalVente,    number>;
  paiements!: Table<LocalPaiement, number>;

  constructor() {
    super('BamtiRevendeurDB');
    this.version(1).stores({
      clients:   '++id_local, id_serveur, nom, synced, cree_par_revendeur',
      ventes:    '++id_local, id_serveur, id_client, date_vente, date_created, synced',
      paiements: '++id_local, id_serveur, id_vente_local, synced'
    });
  }
}

export const db = new BamtiDB();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Aujourd'hui au format YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Vider et recharger les clients depuis le serveur (sync initiale) */
export async function seedClientsFromServer(serverClients: Omit<LocalClient, 'id_local' | 'cree_par_revendeur' | 'modifie' | 'synced'>[]): Promise<void> {
  // On ne supprime que les clients serveur (pas ceux créés offline)
  const localOnly = await db.clients.where('id_serveur').equals(0).or('cree_par_revendeur').equals(1).toArray();
  await db.clients.clear();
  // Réinsérer les clients serveur
  await db.clients.bulkAdd(
    serverClients.map(c => ({ ...c, cree_par_revendeur: false, modifie: false, synced: true }))
  );
  // Réinsérer les clients locaux non synchro
  for (const lc of localOnly) {
    if (!lc.synced) {
      const { id_local: _, ...rest } = lc;
      await db.clients.add(rest);
    }
  }
}

/** Ventes du jour courant */
export async function ventesJour(): Promise<LocalVente[]> {
  const t = today();
  return db.ventes.where('date_created').equals(t).toArray();
}

/** Ventes entre deux dates (YYYY-MM-DD) */
export async function ventesPeriode(dateDebut: string, dateFin: string): Promise<LocalVente[]> {
  return db.ventes
    .filter(v => v.date_vente >= dateDebut && v.date_vente <= dateFin)
    .toArray();
}

/** Ventes non soldées (type_paiement=echellonner ET reste > 0) */
export async function ventesRedevables(): Promise<(LocalVente & { reste: number; paiements: LocalPaiement[] })[]> {
  const ventes = await db.ventes.where('type_paiement').equals('echellonner').toArray();
  const result = [];
  for (const v of ventes) {
    const paiements = await db.paiements.where('id_vente_local').equals(v.id_local!).toArray();
    const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
    const reste = v.montant_total - totalPaye;
    if (reste > 0) result.push({ ...v, reste, paiements });
  }
  return result;
}

/** Calcul des totaux sur une liste de ventes */
export async function calculTotaux(ventes: LocalVente[], gainParSachet: number) {
  let totalVente = 0, totalEncaisse = 0, totalReste = 0, totalQte = 0;
  for (const v of ventes) {
    const paiements = await db.paiements.where('id_vente_local').equals(v.id_local!).toArray();
    const encaisse = paiements.reduce((s, p) => s + p.montant, 0);
    totalVente    += v.montant_total;
    totalEncaisse += encaisse;
    totalReste    += v.montant_total - encaisse;
    totalQte      += v.quantite;
  }
  return {
    totalVente, totalEncaisse, totalReste, totalQte,
    gainRevendeur: totalQte * gainParSachet
  };
}

/** Toutes les données non synchro (pour l'envoi au serveur) */
export async function getUnsyncedData() {
  const clients   = await db.clients.where('synced').equals(0).toArray();
  const ventes    = await db.ventes.where('synced').equals(0).toArray();
  const paiements = await db.paiements.where('synced').equals(0).toArray();
  return { clients, ventes, paiements };
}

/** Marquer tout comme synchro après succès */
export async function markAllSynced() {
  await db.clients.where('synced').equals(0).modify({ synced: true });
  await db.ventes.where('synced').equals(0).modify({ synced: true });
  await db.paiements.where('synced').equals(0).modify({ synced: true });
}
