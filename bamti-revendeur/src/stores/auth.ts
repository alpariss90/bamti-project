/**
 * Store Pinia — Authentification BAM.TI Revendeur
 *
 * Règle offline :
 *  - Chaque JOUR, la première connexion exige Internet (appel API)
 *  - Après ça, le revendeur travaille sans connexion (token + user en localStorage)
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import authService from '../services/authService';
import type { UserProfile, LoginPayload } from '../services/authService';
import { seedClientsFromServer } from '../services/db';
import api from '../services/api';

const TOKEN_KEY        = 'bamti_token';
const USER_KEY         = 'bamti_user';
const LAST_LOGIN_KEY   = 'bamti_last_login_date';  // YYYY-MM-DD

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function hasLoggedInToday(): boolean {
  return localStorage.getItem(LAST_LOGIN_KEY) === todayStr();
}

function markLoginToday(): void {
  localStorage.setItem(LAST_LOGIN_KEY, todayStr());
}

export const useAuthStore = defineStore('auth', () => {
  const token   = ref<string | null>(null);
  const user    = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const userProfil      = computed(() => user.value?.profil ?? null);
  const userName        = computed(() => user.value?.nom ?? '');
  const gainParSachet   = computed(() => user.value?.gain_par_sachet ?? 0);
  const idRevendeur     = computed(() => user.value?.id_revendeur ?? null);

  function persistSession(newToken: string, newUser: UserProfile) {
    token.value = newToken;
    user.value  = newUser;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }

  function clearSession() {
    token.value = null;
    user.value  = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_LOGIN_KEY);
  }

  /**
   * Restaure la session au démarrage.
   * - Si déjà connecté aujourd'hui → session locale, pas besoin d'internet
   * - Sinon → exige internet pour ré-authentifier
   */
  async function initFromStorage(): Promise<'needs_login' | 'ok' | 'no_session'> {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser  = localStorage.getItem(USER_KEY);

    if (!savedToken || !savedUser) return 'no_session';

    token.value = savedToken;
    user.value  = JSON.parse(savedUser) as UserProfile;

    if (hasLoggedInToday()) {
      // Déjà connecté aujourd'hui → pas besoin de vérifier en ligne
      return 'ok';
    }

    // Nouvelle journée → vérification en ligne obligatoire
    return 'needs_login';
  }

  /**
   * Connexion (exige internet)
   * Après connexion réussie :
   *  1. Stocke token + user
   *  2. Marque la date du jour
   *  3. Synchronise la liste des clients
   */
  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true;
    error.value   = null;
    try {
      const res = await authService.login(payload);
      persistSession(res.token, res.user);
      markLoginToday();

      // Sync liste clients depuis le serveur
      try {
        const { data } = await api.get('/api/mobile/clients');
        if (data.success) {
          await seedClientsFromServer(data.clients);
        }
      } catch {
        // Echec sync clients non bloquant
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        'Connexion impossible. Vérifiez votre connexion internet.';
      error.value = msg;
      throw new Error(msg);
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await authService.logout();
    } catch { /* silencieux */ }
    finally {
      clearSession();
      loading.value = false;
    }
  }

  return {
    token, user, loading, error,
    isAuthenticated, userProfil, userName, gainParSachet, idRevendeur,
    initFromStorage, login, logout,
    currentUser: computed(() => user.value),
  };
});
