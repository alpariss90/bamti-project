<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Recette du jour</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="charger" :disabled="loading">
            <ion-icon :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Erreur réseau -->
      <ion-note v-if="erreur" color="danger" class="erreur-bloc">
        <ion-icon :icon="wifiOutline" class="ion-margin-end" />
        {{ erreur }}
      </ion-note>

      <!-- Chargement -->
      <div v-if="loading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent" />
      </div>

      <template v-if="!loading && !erreur && data">
        <!-- Cartes récapitulatives -->
        <div class="recap-grid">
          <div class="recap-card primary">
            <div class="recap-value">{{ fmt(data.totaux.totalVente) }} F</div>
            <div class="recap-label">Total ventes</div>
          </div>
          <div class="recap-card success">
            <div class="recap-value">{{ fmt(data.totaux.totalEncaisse) }} F</div>
            <div class="recap-label">Encaissé</div>
          </div>
          <div class="recap-card danger">
            <div class="recap-value">{{ fmt(data.totaux.totalReste) }} F</div>
            <div class="recap-label">Reste</div>
          </div>
          <div class="recap-card warning">
            <div class="recap-value">{{ fmt(data.totaux.gainRevendeur) }} F</div>
            <div class="recap-label">Gain ({{ data.totaux.totalQte }} sachets)</div>
          </div>
        </div>

        <!-- Tableau des ventes -->
        <ion-card v-if="data.ventes.length">
          <ion-card-header>
            <ion-card-subtitle>{{ today }}</ion-card-subtitle>
            <ion-card-title>Détail des ventes</ion-card-title>
          </ion-card-header>
          <ion-list lines="full">
            <ion-item v-for="v in data.ventes" :key="v.id">
              <ion-label>
                <h2>{{ v.Client?.nom }} {{ v.Client?.prenom }}</h2>
                <p>{{ v.quantite }} sachet(s) × {{ fmt(v.prix_unitaire) }} F = {{ fmt(v.montantTotal) }} F</p>
                <p>
                  Encaissé : <strong>{{ fmt(v.montantPayes) }} F</strong>
                  <span v-if="v.reste > 0"> — Reste : <strong class="text-danger">{{ fmt(v.reste) }} F</strong></span>
                </p>
              </ion-label>
              <ion-badge slot="end" :color="v.type_paiement === 'total' ? 'success' : 'warning'">
                {{ v.type_paiement === 'total' ? 'Soldé' : 'Éch.' }}
              </ion-badge>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-note v-else color="medium" class="ion-padding">
          Aucune vente enregistrée aujourd'hui.
        </ion-note>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonMenuButton, IonIcon,
  IonSpinner, IonNote, IonList, IonItem, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonBadge,
  onIonViewWillEnter,
} from '@ionic/vue';
import { ref } from 'vue';
import { refreshOutline, wifiOutline } from 'ionicons/icons';
import { authStore } from '@/stores/auth';
import { mobileDataService } from '@/services/mobileDataService';
import type { RecetteResponse } from '@/types/data';

const loading = ref(false);
const erreur = ref('');
const data = ref<RecetteResponse | null>(null);
const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function fmt(n: number): string {
  return Number(n).toLocaleString('fr-FR');
}

async function charger(): Promise<void> {
  if (!authStore.state.token) return;
  loading.value = true;
  erreur.value = '';
  try {
    data.value = await mobileDataService.recetteJour(authStore.state.token);
  } catch {
    data.value = null;
    erreur.value = 'Le serveur ne répond pas. Vérifiez votre connexion et réessayez.';
  } finally {
    loading.value = false;
  }
}

onIonViewWillEnter(() => { charger(); });
</script>

<style scoped>
.erreur-bloc {
  display: block;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.recap-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.recap-card {
  border-radius: 10px;
  padding: 14px 10px;
  text-align: center;
  color: #fff;
}
.recap-card.primary  { background: var(--ion-color-primary); }
.recap-card.success  { background: var(--ion-color-success); }
.recap-card.danger   { background: var(--ion-color-danger); }
.recap-card.warning  { background: var(--ion-color-warning); color: #222; }
.recap-value { font-size: 1.2rem; font-weight: 700; }
.recap-label { font-size: 0.75rem; margin-top: 4px; opacity: 0.9; }
.text-danger { color: var(--ion-color-danger); }
</style>
