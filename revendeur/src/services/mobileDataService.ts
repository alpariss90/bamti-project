import { apiRequest } from '@/services/http';
import type { BootstrapResponse, SyncPayload, RecetteResponse } from '@/types/data';

interface SyncResponse {
  success: boolean;
  message: string;
  resultats: {
    clients: number;
    ventes: number;
    paiements: number;
    erreurs: string[];
  };
}

export const mobileDataService = {
  bootstrap(token: string): Promise<BootstrapResponse> {
    return apiRequest<BootstrapResponse>('/api/mobile/bootstrap', {
      method: 'GET',
      token,
    });
  },

  sync(token: string, payload: SyncPayload): Promise<SyncResponse> {
    return apiRequest<SyncResponse>('/api/mobile/sync', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  deleteClient(token: string, clientId: number): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/mobile/clients/${clientId}`, {
      method: 'DELETE',
      token,
    });
  },

  recetteJour(token: string): Promise<RecetteResponse> {
    return apiRequest<RecetteResponse>('/api/mobile/recette/jour', {
      method: 'GET',
      token,
    });
  },

  recettePeriode(token: string, dateDebut: string, dateFin: string): Promise<RecetteResponse> {
    return apiRequest<RecetteResponse>(
      `/api/mobile/recette/periode?date_debut=${dateDebut}&date_fin=${dateFin}`,
      { method: 'GET', token }
    );
  },
};
