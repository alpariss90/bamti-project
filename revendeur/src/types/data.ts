export interface LocalClient {
  id: number;
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface LocalVente {
  id: number;
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
  nom: string;
  prenom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface PendingVentePayload {
  id_local: number;
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
  id_vente_local: number;
  id_vente?: number;
  montant: number;
  date: string;
  observation: string | null;
}

export interface SyncPayload {
  clients: PendingClientPayload[];
  ventes: PendingVentePayload[];
  paiements: PendingPaiementPayload[];
}
