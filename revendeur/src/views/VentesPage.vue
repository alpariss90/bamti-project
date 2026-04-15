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
        placeholder="Rechercher par nom, prenom ou telephone client"
        :debounce="200"
      />

      <ion-item lines="none">
        <ion-label>Afficher seulement les ventes non soldees</ion-label>
        <ion-toggle v-model="onlyUnpaid" />
      </ion-item>

      <ion-list v-if="filteredVentes.length">
        <ion-item v-for="vente in filteredVentes" :key="vente.id">
          <ion-label>
            <h2>{{ clientName(vente.id_client) }}</h2>
            <p>Date: {{ formatDate(vente.date_vente) }}</p>
            <p>Quantite: {{ vente.quantite }} | PU: {{ vente.prix_unitaire }}</p>
            <p>Total: {{ vente.montant }} | Paye: {{ totalPaid(vente.id) }} | Reste: {{ remainingAmount(vente.id, vente.montant) }}</p>
          </ion-label>
          <ion-button fill="clear" slot="end" :router-link="`/ventes/${vente.id}/paiements`">
            Paiements
          </ion-button>
        </ion-item>
      </ion-list>
      <ion-note v-else color="medium">Aucune vente ne correspond aux filtres.</ion-note>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonToggle,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { authStore } from '@/stores/auth';
import { dataStore } from '@/stores/dataStore';

onIonViewWillEnter(() => {
  dataStore.hydrate();
});

const ventes = computed(() => {
  const userId = authStore.state.user?.id;
  if (!userId) {
    return [];
  }
  return dataStore.getVentesByUser(userId);
});

const searchTerm = ref('');
const onlyUnpaid = ref(false);

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

function clientName(clientId: number): string {
  const client = dataStore.state.clients.find((item) => item.id === clientId);
  return client ? `${client.nom} ${client.prenom}` : `Client #${clientId}`;
}

function totalPaid(venteId: number): number {
  return dataStore
    .getPaiementsByVente(venteId)
    .reduce((sum, paiement) => sum + Number(paiement.montant), 0);
}

function remainingAmount(venteId: number, montant: number): number {
  return Math.max(0, Number(montant) - totalPaid(venteId));
}

function formatDate(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString('fr-FR');
}
</script>
