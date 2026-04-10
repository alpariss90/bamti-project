/**
 * Service d'authentification — Appels API vers /api/mobile/auth/*
 */
import api from './api';

export interface LoginPayload {
  login: string;
  password: string;
}

export interface UserProfile {
  id: number;
  nom: string;
  login: string;
  telephone: string | null;
  profil: 'admin' | 'caissier' | 'visualisation' | 'magasinier' | 'revendeur';
  isActive?: boolean;
  id_revendeur?: number | null;
  gain_par_sachet?: number;
  createdAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserProfile;
}

export interface MeResponse {
  success: boolean;
  user: UserProfile;
}

const authService = {
  /**
   * POST /api/mobile/auth/login
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/mobile/auth/login', payload);
    return data;
  },

  /**
   * POST /api/mobile/auth/logout
   */
  async logout(): Promise<void> {
    await api.post('/api/mobile/auth/logout');
  },

  /**
   * GET /api/mobile/auth/me
   */
  async me(): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>('/api/mobile/auth/me');
    return data;
  },
};

export default authService;
