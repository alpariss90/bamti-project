<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/ventes" />
        </ion-buttons>
        <ion-title>Paiements de la vente</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-content>
          <p><strong>Total vente:</strong> {{ vente?.montant ?? 0 }}</p>
          <p><strong>Total paye:</strong> {{ totalPaid }}</p>
          <p><strong>Reste:</strong> {{ remainingAmount }}</p>
          <ion-button v-if="canAddPaiement" expand="block" @click="openPaiementModal">
            Ajouter paiement
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-list v-if="paiements.length">
        <ion-item v-for="paiement in paiements" :key="paiement.id">
          <ion-label>
            <h2>Montant: {{ paiement.montant }}</h2>
            <p>Date: {{ formatDate(paiement.date) }}</p>
            <p v-if="paiement.observation">Observation: {{ paiement.observation }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-note v-else color="medium">Aucun paiement lie a cette vente.</ion-note>

      <ion-modal :is-open="isPaiementOpen" @didDismiss="closePaiementModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Ajouter paiement</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closePaiementModal">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item>
            <ion-input v-model.number="paiementForm.montant" type="number" label="Montant" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="paiementForm.date" type="date" label="Date" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="paiementForm.observation" label="Observation" label-placement="stacked" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="savePaiement">Enregistrer</ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { dataStore } from '@/stores/dataStore';

const route = useRoute();

onIonViewWillEnter(() => {
  dataStore.hydrate();
});

const venteId = computed(() => Number(route.params.id));
const vente = computed(() => dataStore.state.ventes.find((item) => item.id === venteId.value) || null);
const paiements = computed(() => dataStore.getPaiementsByVente(venteId.value));
const totalPaid = computed(() => paiements.value.reduce((sum, item) => sum + Number(item.montant), 0));
const remainingAmount = computed(() => dataStore.getRemainingAmount(venteId.value));
const canAddPaiement = computed(() => remainingAmount.value > 0);
const isPaiementOpen = ref(false);
const paiementForm = ref({
  montant: 0,
  date: new Date().toISOString().split('T')[0],
  observation: '',
});

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

function savePaiement(): void {
  if (!canAddPaiement.value) {
    window.alert('Cette vente est deja soldee.');
    return;
  }

  try {
    dataStore.addPaiementOffline({
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
