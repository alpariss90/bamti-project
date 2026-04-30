<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Mise à jour données</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Carte explicative -->
      <ion-card class="info-card">
        <ion-card-content>
          <div class="info-row">
            <ion-icon :icon="cloudDownloadOutline" class="info-icon" />
            <div>
              <p class="info-title">Récupérer mes données</p>
              <p class="info-desc">
                Compare le serveur avec votre stockage local et importe les clients,
                ventes et paiements manquants. Utile après un changement de device.
              </p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Résultat de la dernière mise à jour -->
      <ion-card v-if="resultat" class="result-card">
        <ion-card-content>
          <p class="result-title">
            <ion-icon :icon="checkmarkCircleOutline" class="result-icon" />
            Mise à jour terminée
          </p>
          <div class="result-grid">
            <div class="result-item">
              <span class="result-value">{{ resultat.clients }}</span>
              <span class="result-label">Clients ajoutés</span>
            </div>
            <div class="result-item">
              <span class="result-value">{{ resultat.ventes }}</span>
              <span class="result-label">Ventes ajoutées</span>
            </div>
            <div class="result-item">
              <span class="result-value">{{ resultat.paiements }}</span>
              <span class="result-label">Paiements ajoutés</span>
            </div>
          </div>
          <p v-if="resultat.clients === 0 && resultat.ventes === 0 && resultat.paiements === 0" class="up-to-date">
            <ion-icon :icon="checkmarkDoneOutline" />
            Vos données sont déjà à jour.
          </p>
        </ion-card-content>
      </ion-card>

      <!-- Erreur -->
      <ion-card v-if="erreur" class="error-card">
        <ion-card-content>
          <div class="info-row">
            <ion-icon :icon="wifiOutline" class="error-icon" />
            <p class="error-text">{{ erreur }}</p>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Bouton principal -->
      <ion-button
        expand="block"
        class="btn-maj"
        :disabled="loading || !isOnline"
        @click="lancer"
      >
        <ion-spinner v-if="loading" name="crescent" class="ion-margin-end" />
        <ion-icon v-else :icon="cloudDownloadOutline" slot="start" />
        {{ loading ? 'Récupération en cours...' : 'Lancer la mise à jour' }}
      </ion-button>

      <p v-if="!isOnline" class="offline-msg">
        <ion-icon :icon="wifiOutline" />
        Connexion internet requise.
      </p>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  cloudDownloadOutline,
  wifiOutline,
} from 'ionicons/icons';
import { ref } from 'vue';
import { authStore } from '@/stores/auth';
import { dataStore } from '@/stores/dataStore';

const loading  = ref(false);
const erreur   = ref('');
const isOnline = ref(navigator.onLine);
const resultat = ref<{ clients: number; ventes: number; paiements: number } | null>(null);

onIonViewWillEnter(() => {
  isOnline.value = navigator.onLine;
  erreur.value = '';
  resultat.value = null;
});

async function lancer(): Promise<void> {
  if (!authStore.state.token) return;

  loading.value  = true;
  erreur.value   = '';
  resultat.value = null;

  try {
    await dataStore.hydrate();
    const stats = await dataStore.restoreFromServer(authStore.state.token);
    resultat.value = stats;
  } catch {
    erreur.value = 'Le serveur ne répond pas. Vérifiez votre connexion et réessayez.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.info-card {
  border-radius: 14px;
  margin-bottom: 16px;
  border-left: 4px solid var(--ion-color-primary);
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.info-icon {
  font-size: 32px;
  color: var(--ion-color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.info-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
}

.info-desc {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
  line-height: 1.5;
}

/* Résultat */
.result-card {
  border-radius: 14px;
  margin-bottom: 16px;
  border-left: 4px solid #2daf6d;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #2daf6d;
  margin: 0 0 14px;
}

.result-icon {
  font-size: 20px;
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  background: var(--ion-color-light);
  border-radius: 10px;
  padding: 12px 8px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.result-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ion-color-dark);
}

.result-label {
  font-size: 11px;
  color: var(--ion-color-medium);
  text-align: center;
}

.up-to-date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 12px 0 0;
  font-size: 13px;
  color: #2daf6d;
  font-weight: 500;
}

/* Erreur */
.error-card {
  border-radius: 14px;
  margin-bottom: 16px;
  border-left: 4px solid var(--ion-color-danger);
}

.error-icon {
  font-size: 24px;
  color: var(--ion-color-danger);
  flex-shrink: 0;
}

.error-text {
  font-size: 13px;
  color: var(--ion-color-danger);
  margin: 0;
}

/* Bouton */
.btn-maj {
  --background: var(--ion-color-primary);
  --border-radius: 12px;
  margin-bottom: 12px;
}

.offline-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ion-color-medium);
  text-align: center;
}
</style>
