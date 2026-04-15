import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { authStore } from '@/stores/auth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ventes',
    name: 'ventes',
    component: () => import('../views/VentesPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ventes/:id/paiements',
    name: 'paiements',
    component: () => import('../views/PaiementsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clients',
    name: 'clients',
    component: () => import('../views/ClientsPage.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to) => {
  await authStore.restoreSession();

  const requiresAuth = Boolean(to.meta.requiresAuth);
  const isPublic = Boolean(to.meta.public);

  if (requiresAuth && !authStore.state.isAuthenticated) {
    return '/login';
  }

  if (isPublic && authStore.state.isAuthenticated) {
    return '/home';
  }

  return true;
});

export default router;
