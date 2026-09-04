<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Liste des ventes</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-searchbar
        v-model="searchTerm"
        placeholder="Rechercher par nom, prenom ou telephone"
        :debounce="200"
      />

      <ion-item lines="none" class="toggle-item">
        <ion-icon :icon="filterOutline" slot="start" color="medium" />
        <ion-label>Ventes non soldées uniquement</ion-label>
        <ion-toggle v-model="onlyUnpaid" />
      </ion-item>

      <div v-if="visibleVentes.length" class="cards-grid">
        <ion-card v-for="vente in visibleVentes" :key="vente.id" class="vente-card">
          <ion-card-content>

            <!-- En-tête : nom client + badge statut -->
            <div class="card-top">
              <div class="client-bloc">
                <div class="avatar">{{ initialesClient(vente.id_client) }}</div>
                <div>
                  <p class="client-name">{{ clientName(vente.id_client) }}</p>
                  <p class="vente-date">
                    <ion-icon :icon="calendarOutline" class="icon-sm" />
                    {{ formatDate(vente.date_vente) }}
                  </p>
                </div>
              </div>
              <span :class="['badge', remainingAmount(vente.id, vente.montant) === 0 ? 'badge-ok' : 'badge-due']">
                {{ remainingAmount(vente.id, vente.montant) === 0 ? 'Soldée' : 'En cours' }}
              </span>
            </div>

            <!-- Détails financiers -->
            <div class="finance-row">
              <div class="finance-item">
                <span class="finance-label">Qté × PU</span>
                <span class="finance-value">{{ vente.quantite }} × {{ vente.prix_unitaire }}</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">Total</span>
                <span class="finance-value total">{{ vente.montant }} F</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">Payé</span>
                <span class="finance-value paid">{{ totalPaid(vente.id) }} F</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">Reste</span>
                <span :class="['finance-value', remainingAmount(vente.id, vente.montant) > 0 ? 'due' : 'paid']">
                  {{ remainingAmount(vente.id, vente.montant) }} F
                </span>
              </div>
            </div>

            <!-- Barre de progression paiement -->
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: progressPercent(vente.id, vente.montant) + '%' }"
              />
            </div>

            <!-- Bouton paiements -->
            <ion-button
              expand="block"
              class="btn-paiements"
              :router-link="`/ventes/${vente.id}/paiements`"
            >
              <ion-icon :icon="walletOutline" slot="start" />
              Voir paiements
            </ion-button>

          </ion-card-content>
        </ion-card>
      </div>

      <div v-else class="empty-state">
        <ion-icon :icon="receiptOutline" class="empty-icon" />
        <p>Aucune vente ne correspond aux filtres.</p>
      </div>

      <ion-infinite-scroll :disabled="displayedCount >= filteredVentes.length" @ionInfinite="loadMore">
        <ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Chargement..." />
      </ion-infinite-scroll>
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonToggle,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  calendarOutline,
  filterOutline,
  receiptOutline,
  walletOutline,
} from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import { authStore } from '@/stores/auth';
import { dataStore } from '@/stores/dataStore';

onIonViewWillEnter(async () => {
  await dataStore.hydrate();
});

const ventes = computed(() => {
  const userId = authStore.state.user?.id;
  if (!userId) return [];
  return dataStore.getVentesByUser(userId);
});

const searchTerm = ref('');
const onlyUnpaid = ref(false);

const PAGE_SIZE = 20;
const displayedCount = ref(PAGE_SIZE);

const filteredVentes = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  return ventes.value.filter((vente) => {
    const client = dataStore.state.clients.find((item) => item.id === vente.id_client);
    const searchTarget = `${client?.nom ?? ''} ${client?.prenom ?? ''} ${client?.telephone ?? ''}`.toLowerCase();
    const matchesSearch = !query || searchTarget.includes(query);
    const isUnpaid = remainingAmount(vente.id, vente.montant) > 0;
    const matchesToggle = !onlyUnpaid.value || isUnpaid;
    return matchesSearch && matchesToggle;
  });
});

const visibleVentes = computed(() => filteredVentes.value.slice(0, displayedCount.value));

watch([searchTerm, onlyUnpaid], () => { displayedCount.value = PAGE_SIZE; });

function loadMore(event: CustomEvent): void {
  displayedCount.value += PAGE_SIZE;
  (event.target as HTMLIonInfiniteScrollElement).complete();
}

function clientName(clientId: number): string {
  const client = dataStore.state.clients.find((item) => item.id === clientId);
  return client ? `${client.nom} ${client.prenom}` : `Client #${clientId}`;
}

function initialesClient(clientId: number): string {
  const client = dataStore.state.clients.find((item) => item.id === clientId);
  if (!client) return '?';
  return `${client.nom.charAt(0)}${client.prenom.charAt(0)}`.toUpperCase();
}

function totalPaid(venteId: number): number {
  return dataStore
    .getPaiementsByVente(venteId)
    .reduce((sum, paiement) => sum + Number(paiement.montant), 0);
}

function remainingAmount(venteId: number, montant: number): number {
  return Math.max(0, Number(montant) - totalPaid(venteId));
}

function progressPercent(venteId: number, montant: number): number {
  if (Number(montant) === 0) return 100;
  return Math.min(100, Math.round((totalPaid(venteId) / Number(montant)) * 100));
}

function formatDate(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString('fr-FR');
}
</script>

<style scoped>
/* Grille */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  padding: 8px 0 16px;
}

.vente-card {
  margin: 0;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* Toggle filtre */
.toggle-item {
  --padding-start: 0;
  margin-bottom: 8px;
}

/* En-tête de card */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.client-bloc {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #1e88e5;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.client-name {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 2px;
}

.vente-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
}

.icon-sm {
  font-size: 13px;
}

/* Badge statut */
.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.badge-ok {
  background: rgba(45, 175, 109, 0.15);
  color: #2daf6d;
}

.badge-due {
  background: rgba(255, 152, 0, 0.15);
  color: #e67e22;
}

/* Grille financière */
.finance-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 6px;
  background: var(--ion-color-light);
  border-radius: 10px;
  padding: 10px 8px;
  margin-bottom: 10px;
}

.finance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.finance-label {
  font-size: 10px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.finance-value {
  font-size: 13px;
  font-weight: 600;
}

.finance-value.total { color: var(--ion-color-dark); }
.finance-value.paid  { color: #2daf6d; }
.finance-value.due   { color: #e67e22; }

/* Barre de progression */
.progress-bar-bg {
  height: 5px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar-fill {
  height: 100%;
  background: #2daf6d;
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Bouton */
.btn-paiements {
  --background: #1e88e5;
  --border-radius: 8px;
  margin: 0;
}

/* Etat vide */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
  opacity: 0.4;
}
</style>
