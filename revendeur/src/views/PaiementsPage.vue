<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/ventes" />
        </ion-buttons>
        <ion-title>Paiements</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Récapitulatif de la vente -->
      <ion-card class="summary-card">
        <ion-card-content>
          <div class="summary-top">
            <div>
              <p class="summary-label">Vente du</p>
              <p class="summary-date">
                <ion-icon :icon="calendarOutline" class="icon-sm" />
                {{ vente ? formatDate(vente.date_vente) : '—' }}
              </p>
            </div>
            <span :class="['badge', remainingAmount === 0 ? 'badge-ok' : 'badge-due']">
              {{ remainingAmount === 0 ? 'Soldée' : 'En cours' }}
            </span>
          </div>

          <div class="amounts-grid">
            <div class="amount-block">
              <span class="amount-label">Total</span>
              <span class="amount-value">{{ vente?.montant ?? 0 }} F</span>
            </div>
            <div class="amount-block">
              <span class="amount-label">Payé</span>
              <span class="amount-value paid">{{ totalPaid }} F</span>
            </div>
            <div class="amount-block">
              <span class="amount-label">Reste</span>
              <span :class="['amount-value', remainingAmount > 0 ? 'due' : 'paid']">
                {{ remainingAmount }} F
              </span>
            </div>
          </div>

          <div class="progress-wrap">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
            </div>
            <span class="progress-label">{{ progressPercent }}% payé</span>
          </div>

          <ion-button
            v-if="canAddPaiement"
            expand="block"
            class="btn-add"
            @click="openPaiementModal"
          >
            <ion-icon :icon="addCircleOutline" slot="start" />
            Ajouter un paiement
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Timeline des paiements -->
      <p class="section-title" v-if="paiements.length">
        <ion-icon :icon="timeOutline" class="icon-sm" />
        Historique ({{ paiements.length }})
      </p>

      <div v-if="paiements.length" class="timeline">
        <div v-for="(paiement, index) in paiements" :key="paiement.id" class="timeline-item">
          <div class="timeline-line">
            <div class="timeline-dot" />
            <div v-if="index < paiements.length - 1" class="timeline-connector" />
          </div>
          <ion-card class="paiement-card">
            <ion-card-content>
              <div class="paiement-row">
                <div>
                  <p class="paiement-amount">{{ paiement.montant }} F</p>
                  <p class="paiement-date">
                    <ion-icon :icon="calendarOutline" class="icon-sm" />
                    {{ formatDate(paiement.date) }}
                  </p>
                </div>
                <ion-icon :icon="checkmarkCircleOutline" class="check-icon" />
              </div>
              <p v-if="paiement.observation" class="paiement-obs">
                <ion-icon :icon="chatbubbleOutline" class="icon-sm" />
                {{ paiement.observation }}
              </p>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <div v-else class="empty-state">
        <ion-icon :icon="walletOutline" class="empty-icon" />
        <p>Aucun paiement enregistré pour cette vente.</p>
      </div>

      <!-- Modal ajout paiement -->
      <ion-modal :is-open="isPaiementOpen" @didDismiss="closePaiementModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Nouveau paiement</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closePaiementModal">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item>
            <ion-input
              v-model.number="paiementForm.montant"
              type="number"
              label="Montant (F)"
              label-placement="stacked"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model="paiementForm.date"
              type="date"
              label="Date"
              label-placement="stacked"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model="paiementForm.observation"
              label="Observation (optionnel)"
              label-placement="stacked"
            />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top btn-add" @click="savePaiement">
            Enregistrer
          </ion-button>
        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addCircleOutline,
  calendarOutline,
  chatbubbleOutline,
  checkmarkCircleOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { dataStore } from '@/stores/dataStore';

const route = useRoute();

onIonViewWillEnter(async () => {
  await dataStore.hydrate();
});

const venteId = computed(() => Number(route.params.id));
const vente = computed(() => dataStore.state.ventes.find((item) => item.id === venteId.value) || null);
const paiements = computed(() => dataStore.getPaiementsByVente(venteId.value));
const totalPaid = computed(() => paiements.value.reduce((sum, item) => sum + Number(item.montant), 0));
const remainingAmount = computed(() => dataStore.getRemainingAmount(venteId.value));
const canAddPaiement = computed(() => remainingAmount.value > 0);

const progressPercent = computed(() => {
  const montant = Number(vente.value?.montant ?? 0);
  if (montant === 0) return 100;
  return Math.min(100, Math.round((totalPaid.value / montant) * 100));
});

const isPaiementOpen = ref(false);
const paiementForm = ref({ montant: 0, date: new Date().toISOString().split('T')[0], observation: '' });

function openPaiementModal(): void {
  paiementForm.value = {
    montant: remainingAmount.value,
    date: new Date().toISOString().split('T')[0],
    observation: '',
  };
  isPaiementOpen.value = true;
}

function closePaiementModal(): void {
  isPaiementOpen.value = false;
}

async function savePaiement(): Promise<void> {
  if (!canAddPaiement.value) {
    window.alert('Cette vente est deja soldee.');
    return;
  }
  try {
    await dataStore.addPaiementOffline({
      venteId: venteId.value,
      montant: Number(paiementForm.value.montant),
      date: paiementForm.value.date,
      observation: paiementForm.value.observation,
    });
    closePaiementModal();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Erreur lors de l ajout du paiement.');
  }
}

function formatDate(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString('fr-FR');
}
</script>

<style scoped>
/* ── Carte récapitulatif ── */
.summary-card {
  margin: 0 0 20px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.summary-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.summary-label {
  font-size: 11px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 2px;
}

.summary-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

/* Badge */
.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}
.badge-ok  { background: rgba(45, 175, 109, 0.15); color: #2daf6d; }
.badge-due { background: rgba(230, 126, 34, 0.15);  color: #e67e22; }

/* Grille montants */
.amounts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 12px 8px;
  margin-bottom: 14px;
}

.amount-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.amount-label {
  font-size: 10px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.amount-value       { font-size: 15px; font-weight: 700; }
.amount-value.paid  { color: #2daf6d; }
.amount-value.due   { color: #e67e22; }

/* Barre de progression */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #2daf6d;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.progress-label {
  font-size: 12px;
  font-weight: 600;
  color: #2daf6d;
  white-space: nowrap;
}

.btn-add {
  --background: #1e88e5;
  --border-radius: 10px;
  margin: 0;
}

/* ── Titre section ── */
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

/* ── Timeline ── */
.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.timeline-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 14px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1e88e5;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #1e88e5;
  flex-shrink: 0;
}

.timeline-connector {
  width: 2px;
  flex: 1;
  min-height: 28px;
  background: rgba(30, 136, 229, 0.25);
  margin-top: 4px;
}

.paiement-card {
  flex: 1;
  margin: 0 0 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.paiement-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paiement-amount {
  font-size: 17px;
  font-weight: 700;
  color: #2daf6d;
  margin: 0 0 4px;
}

.paiement-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
}

.check-icon {
  font-size: 26px;
  color: #2daf6d;
  opacity: 0.7;
}

.paiement-obs {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ── Etat vide ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 52px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.icon-sm { font-size: 13px; }
</style>
