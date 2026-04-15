<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Tableau de bord revendeur</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="top-row">
        <NetworkStatusBadge :is-online="isOnline" />
        <ion-button color="dark" @click="logout">Se deconnecter</ion-button>
      </div>

      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>Utilisateur connecte</ion-card-subtitle>
          <ion-card-title>{{ authStore.state.user?.nom ?? '-' }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p><strong>Login:</strong> {{ authStore.state.user?.login ?? '-' }}</p>
          <p><strong>Profil:</strong> {{ authStore.state.user?.profil ?? '-' }}</p>
          <p><strong>Telephone:</strong> {{ authStore.state.user?.telephone ?? '-' }}</p>
          <p><strong>ID revendeur:</strong> {{ authStore.state.user?.id_revendeur ?? '-' }}</p>
          <p><strong>Gain par sachet:</strong> {{ authStore.state.user?.gain_par_sachet ?? 0 }}</p>
          <p><strong>Derniere synchro:</strong> {{ formattedSyncDate }}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import NetworkStatusBadge from '@/components/NetworkStatusBadge.vue';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { authStore } from '@/stores/auth';
import { dataStore } from '@/stores/dataStore';

const router = useRouter();
const { isOnline } = useNetworkStatus();

const formattedSyncDate = computed(() => {
  if (!authStore.state.lastSyncAt) {
    return '-';
  }
  return new Date(authStore.state.lastSyncAt).toLocaleString('fr-FR');
});

onIonViewWillEnter(async () => {
  if (!authStore.state.isAuthenticated) {
    await router.replace('/login');
    return;
  }

  dataStore.hydrate();

  if (isOnline.value) {
    try {
      await authStore.refreshProfile();
      if (authStore.state.token) {
        await dataStore.syncInitialData(authStore.state.token);
      }
    } catch (_error) {
      // La session locale reste disponible si le serveur ne repond pas.
    }
  }
});

async function logout(): Promise<void> {
  authStore.logout();
  await router.replace('/login');
}
</script>

<style scoped>
.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

p {
  margin: 8px 0;
  color: #111;
}
</style>
