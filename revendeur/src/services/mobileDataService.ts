import { apiRequest } from '@/services/http';
import type { BootstrapResponse, SyncPayload } from '@/types/data';

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
};
