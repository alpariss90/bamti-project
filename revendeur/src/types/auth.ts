export interface AuthUser {
  id: number;
  nom: string;
  login: string;
  telephone: string | null;
  profil: 'revendeur';
  id_revendeur: number | null;
  gain_par_sachet: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
  offline_users?: OfflineAuthUser[];
}

export interface MeResponse {
  success: boolean;
  user: AuthUser;
}

export interface CachedAuthData {
  user: AuthUser;
  token: string;
  updatedAt: string;
}

export interface OfflineAuthUser extends AuthUser {
  password_hash: string;
  isActive: boolean;
  lastToken?: string | null;
  updatedAt?: string;
}

export interface OfflineUsersResponse {
  success: boolean;
  users: OfflineAuthUser[];
}
