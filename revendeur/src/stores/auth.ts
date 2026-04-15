import { reactive } from 'vue';
import bcrypt from 'bcryptjs';
import { authService } from '@/services/authService';
import { ApiError } from '@/services/http';
import { localAuthStorage } from '@/services/localAuthStorage';
import type { AuthUser, OfflineAuthUser } from '@/types/auth';

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  lastSyncAt: string | null;
  initializing: boolean;
}

interface LoginResult {
  mode: 'online' | 'offline';
  message: string;
}

function normalizeLogin(login: string): string {
  return login.trim();
}

function mergeOfflineUsers(users: OfflineAuthUser[]): OfflineAuthUser[] {
  const map = new Map<string, OfflineAuthUser>();
  users.forEach((user) => {
    map.set(user.login.toLowerCase(), user);
  });
  return Array.from(map.values());
}

function saveOfflineUsers(users: OfflineAuthUser[]): void {
  localAuthStorage.saveOfflineUsers(mergeOfflineUsers(users));
}

function upsertOfflineUser(user: OfflineAuthUser): void {
  const users = localAuthStorage.getOfflineUsers();
  const filtered = users.filter((item) => item.login.toLowerCase() !== user.login.toLowerCase());
  saveOfflineUsers([...filtered, user]);
}

function withAuthUserFromOffline(rawUser: OfflineAuthUser): AuthUser {
  return {
    id: rawUser.id,
    nom: rawUser.nom,
    login: rawUser.login,
    telephone: rawUser.telephone,
    profil: 'revendeur',
    id_revendeur: rawUser.id_revendeur,
    gain_par_sachet: rawUser.gain_par_sachet,
  };
}

const state = reactive<AuthState>({
  isAuthenticated: false,
  user: null,
  token: null,
  lastSyncAt: null,
  initializing: false,
});

let restorePromise: Promise<void> | null = null;

function setSession(user: AuthUser, token: string, lastSyncAt: string): void {
  state.isAuthenticated = true;
  state.user = user;
  state.token = token;
  state.lastSyncAt = lastSyncAt;
}

function clearSession(): void {
  state.isAuthenticated = false;
  state.user = null;
  state.token = null;
  state.lastSyncAt = null;
}

async function loginOnline(login: string, password: string): Promise<LoginResult> {
  const response = await authService.login({ login, password });
  const now = new Date().toISOString();

  let remoteUsers = response.offline_users ?? [];
  if (!remoteUsers.length) {
    const fallback = await authService.getOfflineUsers(response.token);
    remoteUsers = fallback.users;
  }

  const normalizedRemoteUsers: OfflineAuthUser[] = remoteUsers.map((user) => ({
    ...user,
    lastToken: user.login.toLowerCase() === response.user.login.toLowerCase() ? response.token : user.lastToken ?? null,
    updatedAt: now,
  }));
  saveOfflineUsers(normalizedRemoteUsers.filter((user) => Boolean(user.password_hash)));

  localAuthStorage.saveAuthCache({
    user: response.user,
    token: response.token,
    updatedAt: now,
  });

  setSession(response.user, response.token, now);
  return { mode: 'online', message: 'Connecte au serveur.' };
}

async function loginOffline(login: string, password: string): Promise<LoginResult> {
  const users = localAuthStorage.getOfflineUsers();
  if (!users.length) {
    throw new Error('Aucune donnee locale disponible. Connectez-vous en ligne une premiere fois.');
  }

  const offlineUser = users.find((user) => user.login.toLowerCase() === login.toLowerCase());
  if (!offlineUser) {
    throw new Error('Utilisateur introuvable dans la base locale.');
  }

  if (!offlineUser.isActive) {
    throw new Error('Compte desactive localement.');
  }

  if (offlineUser.profil !== 'revendeur') {
    throw new Error('Acces reserve aux revendeurs.');
  }

  const matches = await bcrypt.compare(password, offlineUser.password_hash);
  if (!matches) {
    throw new Error('Identifiants locaux invalides.');
  }

  const now = new Date().toISOString();
  localAuthStorage.saveAuthCache({
    user: withAuthUserFromOffline(offlineUser),
    token: offlineUser.lastToken ?? '',
    updatedAt: now,
  });
  setSession(withAuthUserFromOffline(offlineUser), offlineUser.lastToken ?? '', now);
  return { mode: 'offline', message: 'Mode hors ligne.' };
}

export const authStore = {
  state,

  async restoreSession(): Promise<void> {
    if (state.initializing) {
      await restorePromise;
      return;
    }

    state.initializing = true;
    restorePromise = (async () => {
      const cache = localAuthStorage.getAuthCache();
      if (!cache) {
        clearSession();
        return;
      }

      setSession(cache.user, cache.token, cache.updatedAt);
    })();

    try {
      await restorePromise;
    } finally {
      state.initializing = false;
      restorePromise = null;
    }
  },

  async login(login: string, password: string, isOnline: boolean): Promise<LoginResult> {
    const normalizedLogin = normalizeLogin(login);
    if (!normalizedLogin || !password) {
      throw new Error('Le login et le mot de passe sont obligatoires.');
    }

    if (!isOnline) {
      return loginOffline(normalizedLogin, password);
    }

    try {
      return await loginOnline(normalizedLogin, password);
    } catch (error) {
      if (error instanceof ApiError && [500, 503, 504].includes(error.status)) {
        return loginOffline(normalizedLogin, password);
      }

      if (error instanceof TypeError) {
        return loginOffline(normalizedLogin, password);
      }

      throw error;
    }
  },

  async refreshProfile(): Promise<void> {
    if (!state.token) {
      return;
    }

    const response = await authService.me(state.token);
    const now = new Date().toISOString();
    const cache = localAuthStorage.getAuthCache();
    localAuthStorage.saveAuthCache({
      user: response.user,
      token: cache?.token ?? state.token,
      updatedAt: now,
    });

    const users = localAuthStorage.getOfflineUsers();
    const existingUser = users.find((item) => item.login.toLowerCase() === response.user.login.toLowerCase());
    if (existingUser) {
      upsertOfflineUser({
        ...existingUser,
        lastToken: state.token,
        updatedAt: now,
      });
    }

    try {
      const offlineUsersResponse = await authService.getOfflineUsers(state.token);
      saveOfflineUsers(
        offlineUsersResponse.users.map((user) => ({
          ...user,
          lastToken: user.login.toLowerCase() === response.user.login.toLowerCase() ? state.token : user.lastToken ?? null,
          updatedAt: now,
        }))
      );
    } catch (_error) {
      // Si la synchro users echoue, l'application conserve la base locale existante.
    }

    setSession(response.user, cache?.token ?? state.token, now);
  },

  logout(): void {
    localAuthStorage.clearSession();
    clearSession();
  },

  async syncOfflineUsersFromServer(): Promise<void> {
    if (!state.token) {
      return;
    }
    const response = await authService.getOfflineUsers(state.token);
    const now = new Date().toISOString();
    saveOfflineUsers(
      response.users.map((user) => ({
        ...user,
        lastToken: user.login.toLowerCase() === state.user?.login?.toLowerCase() ? state.token : user.lastToken ?? null,
        updatedAt: now,
      }))
    );
  },
};
