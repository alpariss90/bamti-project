import { apiRequest } from '@/services/http';
import type { AuthResponse, MeResponse, OfflineUsersResponse } from '@/types/auth';

interface LoginPayload {
  login: string;
  password: string;
}

export const authService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  me(token: string): Promise<MeResponse> {
    return apiRequest<MeResponse>('/api/mobile/auth/me', {
      method: 'GET',
      token,
    });
  },

  getOfflineUsers(token: string): Promise<OfflineUsersResponse> {
    return apiRequest<OfflineUsersResponse>('/api/mobile/auth/offline-users', {
      method: 'GET',
      token,
    });
  },
};
