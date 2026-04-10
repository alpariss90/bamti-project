/**
 * Configuration Axios centralisée pour l'app BAM.TI Revendeur
 * Toutes les requêtes API passent par cette instance.
 */
import axios from 'axios';

// URL de base du serveur backend — à adapter selon l'environnement
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Intercepteur de requête : injecte le token JWT si présent ──────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bamti_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur de réponse : gestion centralisée des erreurs 401 ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide : nettoyage du stockage local
      localStorage.removeItem('bamti_token');
      localStorage.removeItem('bamti_user');
      // La redirection est gérée par le router guard
    }
    return Promise.reject(error);
  }
);

export default api;
