/**
 * Router Ionic + VueJS — BAM.TI Revendeur
 * Intègre un guard de navigation pour protéger les routes privées.
 */
import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

// ── Définition des routes ────────────────────────────────────────────────────
const routes: Array<RouteRecordRaw> = [
  // Redirection racine → login si non authentifié, sinon home
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

  // ── Routes privées : nécessitent un token JWT valide ───────────────────
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { requiresAuth: true },
  },

  // Ajout futur : commandes, ventes, clients…
  // {
  //   path: '/commandes',
  //   name: 'Commandes',
  //   component: () => import('@/views/CommandesPage.vue'),
  //   meta: { requiresAuth: true },
  // },

  // Fallback : toute route inconnue → login
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
  const token = localStorage.getItem('bamti_token');
  const requiresAuth = to.meta.requiresAuth !== false; // par défaut : protégé

  if (requiresAuth && !token) {
    // Pas de token → redirection vers login
    next({ name: 'Login' });
  } else if (to.name === 'Login' && token) {
    // Déjà connecté → ne pas afficher le login, rediriger vers home
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;
