/**
 * Router Ionic + VueJS — BAM.TI Revendeur
 * Intègre un guard de navigation pour protéger les routes privées.
 * Seuls les utilisateurs avec le profil 'revendeur' peuvent accéder aux routes privées.
 */
import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

// ── Définition des routes ────────────────────────────────────────────────────
const routes: Array<RouteRecordRaw> = [
  // Redirection racine → home
  {
    path: '/',
    redirect: '/home',
  },

  // ── Route publique : Login ──────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { requiresAuth: false },
  },

  // ── Route d'accueil ─────────────────────────────────────────────────────
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { requiresAuth: true },
  },

  // ── Gestion Clients ─────────────────────────────────────────────────────
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('@/views/ClientsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clients/nouveau',
    name: 'NouveauClient',
    component: () => import('@/views/ClientFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clients/modifier/:id',
    name: 'ModifierClient',
    component: () => import('@/views/ClientFormPage.vue'),
    meta: { requiresAuth: true },
  },

  // ── Gestion Ventes ──────────────────────────────────────────────────────
  {
    path: '/ventes',
    redirect: '/ventes/jour',
  },
  {
    path: '/ventes/nouvelle',
    name: 'NouvelleVente',
    component: () => import('@/views/NouvelleVentePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ventes/jour',
    name: 'RecetteJour',
    component: () => import('@/views/RecetteJourPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ventes/periode',
    name: 'SituationDate',
    component: () => import('@/views/SituationDatePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ventes/redevables',
    name: 'Redevables',
    component: () => import('@/views/RedevablesPage.vue'),
    meta: { requiresAuth: true },
  },

  // Fallback
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
];

// ── Création du router ───────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ── Guard global de navigation ───────────────────────────────────────────────
router.beforeEach((to, _from, next) => {
  const token       = localStorage.getItem('bamti_token');
  const userJson    = localStorage.getItem('bamti_user');
  const requiresAuth = to.meta.requiresAuth !== false;

  if (requiresAuth && !token) {
    // Pas de token → login
    return next({ name: 'Login' });
  }

  if (to.name === 'Login' && token) {
    // Déjà connecté → home
    return next({ name: 'Home' });
  }

  // Vérification du profil revendeur pour les routes protégées
  if (requiresAuth && token && userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user.profil !== 'revendeur') {
        // Profil non autorisé → déconnexion
        localStorage.removeItem('bamti_token');
        localStorage.removeItem('bamti_user');
        localStorage.removeItem('bamti_last_login_date');
        return next({ name: 'Login' });
      }
    } catch {
      return next({ name: 'Login' });
    }
  }

  next();
});

export default router;
