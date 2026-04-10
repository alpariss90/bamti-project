<template>
  <ion-page>
    <!-- ── Header ───────────────────────────────────────────────────── -->
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button color="light" />
        </ion-buttons>
        <ion-title class="bamti-title">
          <span class="title-bam">BAM</span><span class="title-dot">.</span><span class="title-ti">TI</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="confirmLogout" class="logout-btn">
            <ion-icon :icon="logOutOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- ── Contenu ───────────────────────────────────────────────────── -->
    <ion-content class="home-content">

      <!-- Bannière de bienvenue -->
      <div class="welcome-banner">
        <div class="welcome-avatar">
          <ion-icon :icon="personCircleOutline" />
        </div>
        <div class="welcome-text">
          <p class="welcome-label">Bienvenue,</p>
          <h2 class="welcome-name">{{ authStore.userName }}</h2>
          <ion-badge color="primary" class="profil-badge">Revendeur</ion-badge>
        </div>
      </div>

      <!-- Section Clients -->
      <div class="section-title">Gestion Clients</div>
      <ion-grid class="nav-grid">
        <ion-row>
          <ion-col size="6" v-for="item in clientItems" :key="item.label">
            <div class="nav-card" @click="router.push(item.url)">
              <div class="nav-icon-wrapper" :style="{ background: item.gradient }">
                <ion-icon :icon="item.icon" class="nav-icon" />
              </div>
              <p class="nav-label">{{ item.label }}</p>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Section Ventes -->
      <div class="section-title">Gestion Ventes</div>
      <ion-grid class="nav-grid">
        <ion-row>
          <ion-col size="6" v-for="item in venteItems" :key="item.label">
            <div class="nav-card" @click="router.push(item.url)">
              <div class="nav-icon-wrapper" :style="{ background: item.gradient }">
                <ion-icon :icon="item.icon" class="nav-icon" />
              </div>
              <p class="nav-label">{{ item.label }}</p>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Gain par sachet -->
      <div class="section-title">Mon compte</div>
      <ion-card class="info-card">
        <ion-card-content>
          <ion-list lines="none">
            <ion-item class="info-item">
              <ion-icon :icon="personOutline" slot="start" color="primary" />
              <ion-label>
                <p class="info-key">Identifiant</p>
                <h3 class="info-val">{{ authStore.user?.login }}</h3>
              </ion-label>
            </ion-item>
            <ion-item class="info-item" v-if="authStore.user?.telephone">
              <ion-icon :icon="callOutline" slot="start" color="primary" />
              <ion-label>
                <p class="info-key">Téléphone</p>
                <h3 class="info-val">{{ authStore.user?.telephone }}</h3>
              </ion-label>
            </ion-item>
            <ion-item class="info-item">
              <ion-icon :icon="cashOutline" slot="start" color="success" />
              <ion-label>
                <p class="info-key">Gain par sachet</p>
                <h3 class="info-val gain-val">{{ authStore.gainParSachet.toLocaleString('fr-FR') }} FCFA</h3>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Bouton Synchroniser -->
      <ion-button
        expand="block"
        class="sync-btn"
        color="primary"
        @click="synchroniser"
        :disabled="syncing"
      >
        <ion-icon :icon="syncOutline" slot="start" />
        <span>{{ syncing ? 'Synchronisation...' : 'Synchroniser les données' }}</span>
      </ion-button>

    </ion-content>

    <!-- ── Dialogue de confirmation de déconnexion ─────────────────── -->
    <ion-alert
      :is-open="showLogoutAlert"
      header="Déconnexion"
      message="Êtes-vous sûr de vouloir vous déconnecter ?"
      :buttons="alertButtons"
      @didDismiss="showLogoutAlert = false"
    />

    <!-- Toast pour messages -->
    <ion-toast
      :is-open="toast.show"
      :message="toast.message"
      :color="toast.color"
      :duration="3000"
      @didDismiss="toast.show = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonMenuButton,
  IonContent, IonCard, IonCardContent,
  IonList, IonItem, IonLabel,
  IonIcon, IonGrid, IonRow, IonCol,
  IonBadge, IonAlert, IonToast,
} from '@ionic/vue';
import {
  logOutOutline, personOutline, personCircleOutline,
  callOutline, cashOutline, syncOutline,
  peopleOutline, personAddOutline,
  receiptOutline, addCircleOutline, calendarOutline,
  walletOutline, alertCircleOutline,
} from 'ionicons/icons';
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';
import { getUnsyncedData, markAllSynced } from '../services/db';

const router    = useRouter();
const authStore = useAuthStore();
const syncing   = ref(false);

const toast = reactive({ show: false, message: '', color: 'success' });
const showLogoutAlert = ref(false);

// ── Menu Clients ────────────────────────────────────────────────────────────
const clientItems = [
  { label: 'Liste clients',  url: '/clients',            icon: peopleOutline,    gradient: 'linear-gradient(135deg, #1A9FE0, #1B2A6B)' },
  { label: 'Nouveau client', url: '/clients/nouveau',    icon: personAddOutline, gradient: 'linear-gradient(135deg, #27AE60, #1e7e44)' },
];

// ── Menu Ventes ─────────────────────────────────────────────────────────────
const venteItems = [
  { label: 'Nouvelle vente',       url: '/ventes/nouvelle',   icon: addCircleOutline,   gradient: 'linear-gradient(135deg, #F39C12, #c27d10)' },
  { label: 'Recette du jour',      url: '/ventes/jour',       icon: receiptOutline,     gradient: 'linear-gradient(135deg, #2E86C1, #1a5276)' },
  { label: 'Situation par date',   url: '/ventes/periode',    icon: calendarOutline,    gradient: 'linear-gradient(135deg, #8E44AD, #5b2c6f)' },
  { label: 'Ventes non soldées',   url: '/ventes/redevables', icon: alertCircleOutline, gradient: 'linear-gradient(135deg, #E74C3C, #922b21)' },
];

// ── Synchronisation ─────────────────────────────────────────────────────────
async function synchroniser() {
  syncing.value = true;
  try {
    const { clients, ventes, paiements } = await getUnsyncedData();
    if (clients.length === 0 && ventes.length === 0 && paiements.length === 0) {
      toast.message = 'Tout est déjà synchronisé !';
      toast.color   = 'success';
      toast.show    = true;
      return;
    }
    const { data } = await api.post('/api/mobile/sync', { clients, ventes, paiements });
    if (data.success) {
      await markAllSynced();
      toast.message = `Synchronisation réussie : ${data.resultats.ventes} vente(s), ${data.resultats.clients} client(s).`;
      toast.color   = 'success';
    } else {
      toast.message = 'Synchronisation échouée.';
      toast.color   = 'danger';
    }
  } catch {
    toast.message = 'Impossible de synchroniser. Vérifiez votre connexion.';
    toast.color   = 'danger';
  } finally {
    syncing.value = false;
    toast.show    = true;
  }
}

// ── Déconnexion ─────────────────────────────────────────────────────────────
function confirmLogout() {
  showLogoutAlert.value = true;
}

const alertButtons = [
  { text: 'Annuler', role: 'cancel' },
  {
    text: 'Déconnecter',
    role: 'confirm',
    handler: async () => {
      await authStore.logout();
      await router.replace({ name: 'Login' });
    },
  },
];
</script>

<style scoped>
/* ── Toolbar ──────────────────────────────────────────────────────── */
.bamti-toolbar {
  --background: var(--bamti-header-bg, #1B2A6B);
  --color: #fff;
}

.bamti-title {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 2px;
}

.title-bam { color: #ffffff; }
.title-dot { color: #f0c040; }
.title-ti  { color: #90caf9; }
.logout-btn { --color: rgba(255,255,255,0.85); }

/* ── Contenu ──────────────────────────────────────────────────────── */
.home-content { --background: #f0f7ff; }

/* ── Bannière de bienvenue ────────────────────────────────────────── */
.welcome-banner {
  background: var(--bamti-gradient, linear-gradient(135deg, #1A9FE0, #1B2A6B));
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 28px;
}

.welcome-avatar ion-icon {
  font-size: 52px;
  color: rgba(255,255,255,0.9);
}

.welcome-label {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.75);
  margin: 0;
}

.welcome-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 2px 0 6px;
}

.profil-badge {
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ── Titres de section ────────────────────────────────────────────── */
.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ion-color-medium);
  padding: 16px 20px 6px;
}

/* ── Grille de navigation ─────────────────────────────────────────── */
.nav-grid { padding: 0 12px; }

.nav-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px 10px 14px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(26, 159, 224, 0.1);
  margin: 6px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.nav-card:active {
  transform: scale(0.96);
  box-shadow: 0 1px 6px rgba(26, 159, 224, 0.15);
}

.nav-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon { font-size: 1.6rem; color: #fff; }

.nav-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ion-color-secondary);
  margin: 0;
}

/* ── Carte d'infos compte ─────────────────────────────────────────── */
.info-card {
  margin: 0 16px;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(26, 159, 224, 0.08);
  --background: #fff;
}

.info-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 4px;
}

.info-key {
  font-size: 0.72rem;
  color: var(--ion-color-medium);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-val {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ion-color-secondary);
  margin: 2px 0 0;
}

.gain-val {
  color: var(--ion-color-success);
}

/* ── Bouton sync ──────────────────────────────────────────────────── */
.sync-btn {
  margin: 20px 16px 12px;
  --border-radius: 12px;
  height: 48px;
  font-weight: 600;
}
</style>
