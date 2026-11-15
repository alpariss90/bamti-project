// Identifiant unique (uuid) donné à la saisie sur le téléphone : il suit le client, la vente ou le
// paiement jusqu'au serveur et sert à reconnaître un élément déjà envoyé (pas de doublon).
// Vide pour un client saisi au guichet (il est alors désigné par son id serveur).

// État d'une vente ou d'un paiement : encore sur le téléphone, reçu par le serveur, validé par l'admin
export type StatutEnvoi = 'telephone' | 'envoyee' | 'validee';

export interface LocalClient {
  id: number;
  uuid?: string | null;
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface LocalVente {
  id: number;
  uuid?: string | null;
  client_uuid?: string | null;
  statut?: StatutEnvoi;
  type_vente: 'livrer' | 'usine';
  quantite: number;
  observation: string | null;
  type_paiement: 'total' | 'echellonner';
  montant: number;
  prix_unitaire: number;
  date_vente: string;
  id_client: number;
  user: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalPaiement {
  id: number;
  uuid?: string | null;
  vente_uuid?: string | null;
  statut?: StatutEnvoi;
  montant: number;
  date: string;
  id_vente: number;
  observation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BootstrapData {
  clients: LocalClient[];
  ventes: LocalVente[];
  paiements: LocalPaiement[];
}

export interface BootstrapResponse {
  success: boolean;
  data: BootstrapData;
}

export interface PendingClientPayload {
  id_local: number;
  uuid?: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface PendingVentePayload {
  id_local: number;
  uuid?: string;
  client_uuid?: string | null;
  id_client_local: number;
  id_client?: number;
  type_vente: 'livrer' | 'usine';
  quantite: number;
  prix_unitaire: number;
  type_paiement: 'total' | 'echellonner';
  date_vente: string;
  observation: string | null;
}

export interface PendingPaiementPayload {
  id_local: number;
  uuid?: string;
  vente_uuid?: string | null;
  id_vente_local: number;
  id_vente?: number;
  montant: number;
  date: string;
  observation: string | null;
}

// Format envoyé à POST /api/mobile/sync : tout est désigné par son uuid
export interface SyncClient {
  uuid: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface SyncVente {
  uuid: string;
  client_uuid?: string; // client saisi sur un téléphone
  id_client?: number;   // client officiel (saisi au guichet)
  type_vente: 'livrer' | 'usine';
  quantite: number;
  prix_unitaire: number;
  type_paiement: 'total' | 'echellonner';
  date_vente: string;
  observation: string | null;
}

export interface SyncPaiement {
  uuid: string;
  vente_uuid: string;
  montant: number;
  date: string;
  observation: string | null;
}

export interface SyncPayload {
  clients: SyncClient[];
  ventes: SyncVente[];
  paiements: SyncPaiement[];
}

export interface SyncResponse {
  success: boolean;
  message: string;
  resultats: {
    clients: number;
    ventes: number;
    paiements: number;
    deja_recus: number;
    acceptes: { clients: string[]; ventes: string[]; paiements: string[] };
    erreurs: string[];
  };
}

export interface RecetteVente {
  id: number;
  type_vente: 'livrer' | 'usine';
  quantite: number;
  observation: string | null;
  type_paiement: 'total' | 'echellonner';
  montant: number;
  prix_unitaire: number;
  date_vente: string;
  id_client: number;
  Client: { id: number; nom: string; prenom: string } | null;
  montantTotal: number;
  montantPayes: number;
  reste: number;
}

export interface RecetteTotaux {
  totalVente: number;
  totalEncaisse: number;
  totalReste: number;
  totalQte: number;
  gainRevendeur: number;
}

export interface RecetteResponse {
  success: boolean;
  ventes: RecetteVente[];
  totaux: RecetteTotaux;
}
