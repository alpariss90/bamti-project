<template>
  <ion-app>
    <!-- ── Menu latéral (affiché uniquement si authentifié) ── -->
    <ion-menu content-id="main-content" type="overlay" v-if="authStore.isAuthenticated">
      <ion-header>
        <ion-toolbar class="menu-toolbar">
          <div class="menu-brand">
            <span class="menu-brand-name">BAM.TI</span>
            <span class="menu-brand-sub">Revendeur</span>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="menu-content">
        <!-- Profil utilisateur -->
        <div class="menu-user" v-if="authStore.user">
          <div class="menu-avatar">
            <ion-icon :icon="personCircleOutline" />
          </div>
          <div class="menu-user-info">
            <p class="menu-user-name">{{ authStore.user.nom }}</p>
            <p class="menu-user-profil">Revendeur</p>
          </div>
        </div>

        <ion-list lines="none" class="menu-list">
          <ion-menu-toggle :auto-hide="false" v-for="(page, i) in menuPages" :key="i">
            <ion-item
              :router-link="page.url"
              router-direction="root"
              class="menu-item"
              :class="{ 'menu-item-active': currentPath.startsWith(page.url) }"
            >
              <ion-icon :icon="page.icon" slot="start" class="menu-item-icon" />
              <ion-label>{{ page.title }}</ion-label>
            </ion-item>
          </ion-menu-toggle>
        </ion-list>
      </ion-content>

      <ion-footer class="menu-footer">
        <ion-button
          expand="block"
          fill="clear"
          class="menu-logout-btn"
          @click="handleLogout"
        >
          <ion-icon :icon="logOutOutline" slot="start" />
          Déconnexion
        </ion-button>
      </ion-footer>
    </ion-menu>

    <!-- ── Outlet principal ── -->
    <ion-router-outlet id="main-content" />
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonToolbar,
  IonButton,
  alertController,
} from '@ionic/vue';
import {
  homeOutline,
  receiptOutline,
  peopleOutline,
  personCircleOutline,
  logOutOutline,
} from 'ionicons/icons';
import { useAuthStore } from './stores/auth';

const route     = useRoute();
const router    = useRouter();
const authStore = useAuthStore();

// Restaure la session depuis localStorage au démarrage
onMounted(async () => {
  await authStore.initFromStorage();
});

const currentPath = computed(() => route.path);

// Menu simplifié : uniquement Accueil, Clients, Ventes
const menuPages = [
  { title: 'Accueil',  url: '/home',    icon: homeOutline    },
  { title: 'Clients',  url: '/clients', icon: peopleOutline  },
  { title: 'Ventes',   url: '/ventes',  icon: receiptOutline },
];

async function handleLogout() {
  const alert = await alertController.create({
    header:  'Déconnexion',
    message: 'Voulez-vous vraiment vous déconnecter ?',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      {
        text:    'Déconnecter',
        role:    'confirm',
        handler: async () => {
          await authStore.logout();
          router.replace('/login');
        },
      },
    ],
  });
  await alert.present();
}
</script>

<style scoped>
/* ── Toolbar menu ────────────────────────────────────────────────── */
.menu-toolbar {
  --background: var(--bamti-gradient, linear-gradient(135deg, #1A9FE0, #1B2A6B));
  --color: #ffffff;
  --padding-top: 16px;
  --padding-bottom: 16px;
}

.menu-brand {
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.menu-brand-name {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #ffffff;
}

.menu-brand-sub {
  font-size: 11px;
  opacity: 0.8;
  color: #ffffff;
  letter-spacing: 1px;
}

/* ── Contenu du menu ─────────────────────────────────────────────── */
.menu-content {
  --background: #f5faff;
}

/* ── Profil dans le menu ─────────────────────────────────────────── */
.menu-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-bottom: 1px solid #d0dff0;
  margin-bottom: 8px;
}

.menu-avatar ion-icon {
  font-size: 44px;
  color: var(--ion-color-primary);
}

.menu-user-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-secondary);
  margin: 0 0 2px;
}

.menu-user-profil {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
}

/* ── Liste du menu ───────────────────────────────────────────────── */
.menu-list {
  padding: 8px;
}

.menu-item {
  --border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  --min-height: 48px;
  margin-bottom: 4px;
  --color: var(--ion-color-secondary);
}

.menu-item-active {
  --background: rgba(26, 159, 224, 0.12);
  --color: var(--ion-color-primary);
  font-weight: 600;
}

.menu-item-icon {
  color: var(--ion-color-primary);
  font-size: 20px;
}

/* ── Pied du menu ────────────────────────────────────────────────── */
.menu-footer {
  padding: 12px;
  border-top: 1px solid #d0dff0;
}

.menu-logout-btn {
  --color: var(--ion-color-danger);
  font-weight: 600;
  font-size: 14px;
  text-transform: none;
}
</style>
