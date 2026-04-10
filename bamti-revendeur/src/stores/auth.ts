/**
 * Store Pinia — Authentification BAM.TI
 *
 * Gère :
 *  - l'état de connexion (token + user)
 *  - la persistance via localStorage
 *  - les actions login / logout / initFromStorage / refreshProfile
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import authService from '../services/authService';
import type { UserProfile, LoginPayload } from '../services/authService';

const TOKEN_KEY = 'bamti_token';
const USER_KEY  = 'bamti_user';

export const useAuthStore = defineStore('auth', () => {
  // ── État ─────────────────────────────────────────────────────────────────
  const token   = ref<string | null>(null);
  const user    = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const userProfil      = computed(() => user.value?.profil ?? null);
  const userName        = computed(() => user.value?.nom ?? '');

  // ── Persistance ───────────────────────────────────────────────────────────
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
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Restaure la session depuis le localStorage au démarrage */
  async function initFromStorage(): Promise<void> {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser  = localStorage.getItem(USER_KEY);
    if (!savedToken || !savedUser) return;

    token.value = savedToken;
    user.value  = JSON.parse(savedUser) as UserProfile;

    // Vérification côté serveur
    try {
      const res = await authService.me();
      user.value = res.user;
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      clearSession();
    }
  }

  /** Connexion */
  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true;
    error.value   = null;
    try {
      const res = await authService.login(payload);
      persistSession(res.token, res.user);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        'Erreur de connexion. Vérifiez votre connexion internet.';
      error.value = msg;
      throw new Error(msg);
    } finally {
      loading.value = false;
    }
  }

  /** Déconnexion */
  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await authService.logout();
    } catch {
      // Déconnexion locale même si le serveur échoue
    } finally {
      clearSession();
      loading.value = false;
    }
  }

  /** Rafraîchit le profil */
  async function refreshProfile(): Promise<void> {
    try {
      const res = await authService.me();
      user.value = res.user;
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      clearSession();
    }
  }

  // Alias for template compatibility
  const currentUser = computed(() => user.value);
  const fetchMe = refreshProfile;
  function clearError() { error.value = null; }

  return {
    token, user, loading, error,
    isAuthenticated, userProfil, userName, currentUser,
    initFromStorage, login, logout, refreshProfile, fetchMe, clearError,
  };
});
