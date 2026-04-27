<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Recette par période</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Sélection des dates -->
      <ion-card class="filtre-card">
        <ion-card-content>
          <ion-item lines="none">
            <ion-input
              v-model="dateDebut"
              type="date"
              label="Date début"
              label-placement="stacked"
            />
          </ion-item>
          <ion-item lines="none">
            <ion-input
              v-model="dateFin"
              type="date"
              label="Date fin"
              label-placement="stacked"
            />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" :disabled="loading" @click="charger">
            <ion-spinner v-if="loading" name="crescent" class="ion-margin-end" />
            {{ loading ? 'Chargement...' : 'Afficher' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Erreur réseau -->
      <ion-note v-if="erreur" color="danger" class="erreur-bloc">
        <ion-icon :icon="wifiOutline" class="ion-margin-end" />
        {{ erreur }}
      </ion-note>

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
            <ion-card-subtitle>
              {{ fmtDate(dateDebut) }} → {{ fmtDate(dateFin) }}
            </ion-card-subtitle>
            <ion-card-title>Détail des ventes</ion-card-title>
          </ion-card-header>
          <ion-list lines="full">
            <ion-item v-for="v in data.ventes" :key="v.id">
              <ion-label>
                <h2>{{ v.Client?.nom }} {{ v.Client?.prenom }}</h2>
                <p class="date-line">{{ fmtDate(v.date_vente) }}</p>
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
          Aucune vente pour cette période.
        </ion-note>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonIcon,
  IonButton, IonSpinner, IonInput, IonItem,
  IonNote, IonList, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonBadge,
} from '@ionic/vue';
import { ref } from 'vue';
import { wifiOutline } from 'ionicons/icons';
import { authStore } from '@/stores/auth';
import { mobileDataService } from '@/services/mobileDataService';
import type { RecetteResponse } from '@/types/data';

const today = new Date().toISOString().split('T')[0];
const dateDebut = ref(today);
const dateFin = ref(today);
const loading = ref(false);
const erreur = ref('');
const data = ref<RecetteResponse | null>(null);

function fmt(n: number): string {
  return Number(n).toLocaleString('fr-FR');
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

async function charger(): Promise<void> {
  if (!authStore.state.token) return;
  if (!dateDebut.value || !dateFin.value) return;
  loading.value = true;
  erreur.value = '';
  data.value = null;
  try {
    data.value = await mobileDataService.recettePeriode(
      authStore.state.token,
      dateDebut.value,
      dateFin.value
    );
  } catch {
    erreur.value = 'Le serveur ne répond pas. Vérifiez votre connexion et réessayez.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.filtre-card { margin-bottom: 16px; }
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
.date-line   { color: var(--ion-color-medium); font-size: 0.8rem; }
.text-danger { color: var(--ion-color-danger); }
</style>
