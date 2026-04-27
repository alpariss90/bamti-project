<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg" v-if="authStore.state.isAuthenticated">
      <ion-menu content-id="main-content">
        <ion-content>
          <ion-list>
            <ion-list-header>BAMTI Revendeur</ion-list-header>
            <ion-note>{{ authStore.state.user?.nom }}</ion-note>

            <ion-menu-toggle :auto-hide="false">
              <ion-item router-link="/home" router-direction="root">
                <ion-label>Accueil</ion-label>
              </ion-item>
            </ion-menu-toggle>
            <ion-menu-toggle :auto-hide="false">
              <ion-item router-link="/ventes" router-direction="root">
                <ion-label>Liste des ventes</ion-label>
              </ion-item>
            </ion-menu-toggle>
            <ion-menu-toggle :auto-hide="false">
              <ion-item router-link="/clients" router-direction="root">
                <ion-label>Liste des clients</ion-label>
              </ion-item>
            </ion-menu-toggle>
            <ion-menu-toggle :auto-hide="false">
              <ion-item router-link="/recette/jour" router-direction="root">
                <ion-label>Recette du jour</ion-label>
              </ion-item>
            </ion-menu-toggle>
            <ion-menu-toggle :auto-hide="false">
              <ion-item router-link="/recette/periode" router-direction="root">
                <ion-label>Recette par période</ion-label>
              </ion-item>
            </ion-menu-toggle>
            <ion-item button @click="syncData">
              <ion-label>Synchroniser les donnees ({{ pendingCount }})</ion-label>
            </ion-item>
            <ion-item button color="danger" @click="cleanLocalData">
              <ion-label>Clean local (DEV)</ion-label>
            </ion-item>
            <ion-item button @click="logout">
              <ion-label>Deconnexion</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-menu>
      <ion-router-outlet id="main-content" />
    </ion-split-pane>
    <ion-router-outlet v-else />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonRouterOutlet,
  IonSplitPane,
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { computed, onMounted } from 'vue';
import { authStore } from '@/stores/auth';
import { dataStore } from '@/stores/dataStore';

const router = useRouter();
const pendingCount = computed(() => dataStore.getPendingCount());

onMounted(async () => {
  await dataStore.hydrate();
});

async function logout(): Promise<void> {
  authStore.logout();
  await router.replace('/login');
}

async function syncData(): Promise<void> {
  if (!navigator.onLine || !authStore.state.token) {
    window.alert('Synchronisation impossible: connexion internet indisponible.');
    return;
  }

  try {
    const result = await dataStore.syncPendingData(authStore.state.token);
    let message = '';
    if (result.errors.length) {
      message = `Synchronisation partielle: ${result.synced} element(s) traite(s).`;
      message += `\nErreurs: ${result.errors.join(' | ')}`;
    } else if (result.synced > 0) {
      message = `Synchronisation terminee (${result.synced} element(s)).`;
    } else {
      message = 'Aucune donnee en attente.';
    }
    window.alert(message);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Erreur de synchronisation.');
  }
}

function cleanLocalData(): void {
  const confirmClean = window.confirm('Supprimer toutes les donnees locales (mode DEV) ?');
  if (!confirmClean) {
    return;
  }
  dataStore.clearLocalDevData();
  window.alert('Donnees locales nettoyees.');
}
</script>
