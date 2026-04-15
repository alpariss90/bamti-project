import type { CachedAuthData, OfflineAuthUser } from '@/types/auth';

const AUTH_CACHE_KEY = 'bamti.revendeur.auth.cache';
const OFFLINE_USERS_KEY = 'bamti.revendeur.auth.users';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashCredentials(login: string, password: string): Promise<string> {
  const normalized = `${login.trim().toLowerCase()}::${password}`;
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', encoded as BufferSource);
  return toHex(digest);
}

export const localAuthStorage = {
  saveAuthCache(payload: CachedAuthData): void {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload));
  },

  getAuthCache(): CachedAuthData | null {
    const rawValue = localStorage.getItem(AUTH_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as CachedAuthData;
    } catch (_error) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
  },

  saveOfflineUsers(users: OfflineAuthUser[]): void {
    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
  },

  getOfflineUsers(): OfflineAuthUser[] {
    const rawValue = localStorage.getItem(OFFLINE_USERS_KEY);
    if (!rawValue) {
      return [];
    }

    try {
      return JSON.parse(rawValue) as OfflineAuthUser[];
    } catch (_error) {
      localStorage.removeItem(OFFLINE_USERS_KEY);
      return [];
    }
  },

  clearSession(): void {
    localStorage.removeItem(AUTH_CACHE_KEY);
  },
};
