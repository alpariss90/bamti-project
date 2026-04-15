<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Liste des clients</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-searchbar
        v-model="searchTerm"
        placeholder="Rechercher par nom, prenom ou telephone"
        :debounce="200"
      />

      <ion-button expand="block" class="add-btn" @click="openAddClientModal">
        Ajouter un client
      </ion-button>

      <ion-list v-if="filteredClients.length">
        <ion-item v-for="client in filteredClients" :key="client.id">
          <ion-label>
            <h2>{{ client.nom }} {{ client.prenom }}</h2>
            <p>Telephone: {{ client.telephone ?? '-' }}</p>
            <p>Adresse: {{ client.adresse ?? '-' }}</p>
          </ion-label>
          <ion-button slot="end" size="small" @click="openVenteModal(client)">Vente</ion-button>
          <ion-button slot="end" size="small" color="danger" @click="deleteClient(client)">Supprimer</ion-button>
        </ion-item>
      </ion-list>
      <ion-note v-else color="medium">Aucun client ne correspond a la recherche.</ion-note>

      <ion-modal :is-open="isAddClientOpen" @didDismiss="closeAddClientModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Nouveau client</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeAddClientModal">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item>
            <ion-input v-model="clientForm.nom" label="Nom" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="clientForm.prenom" label="Prenom" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="clientForm.telephone" label="Telephone" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="clientForm.adresse" label="Adresse" label-placement="stacked" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="saveClient">Enregistrer</ion-button>
        </ion-content>
      </ion-modal>

      <ion-modal :is-open="isVenteOpen" @didDismiss="closeVenteModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Nouvelle vente</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeVenteModal">Fermer</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p><strong>Client:</strong> {{ selectedClient ? `${selectedClient.nom} ${selectedClient.prenom}` : '-' }}</p>
          <ion-item>
            <ion-select v-model="venteForm.type_vente" label="Type de vente" label-placement="stacked">
              <ion-select-option value="usine">Usine</ion-select-option>
              <ion-select-option value="livrer">Livre</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-input v-model.number="venteForm.quantite" type="number" label="Quantite" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model.number="venteForm.prix_unitaire" type="number" label="Prix unitaire" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-select v-model="venteForm.type_paiement" label="Type de paiement" label-placement="stacked">
              <ion-select-option value="total">Total</ion-select-option>
              <ion-select-option value="echellonner">Echelonner</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item v-if="venteForm.type_paiement === 'echellonner'">
            <ion-input v-model.number="venteForm.montant_verse" type="number" label="Montant verse" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="venteForm.date_vente" type="date" label="Date vente" label-placement="stacked" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="saveVente">Enregistrer vente</ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { authStore } from '@/stores/auth';
import type { LocalClient } from '@/types/data';
import { dataStore } from '@/stores/dataStore';

onIonViewWillEnter(() => {
  dataStore.hydrate();
});

const clients = computed(() => dataStore.state.clients);
const searchTerm = ref('');
const isAddClientOpen = ref(false);
const isVenteOpen = ref(false);
const selectedClient = ref<LocalClient | null>(null);

const clientForm = ref({
  nom: '',
  prenom: '',
  telephone: '',
  adresse: '',
});

const venteForm = ref({
  type_vente: 'usine' as 'livrer' | 'usine',
  quantite: 1,
  prix_unitaire: 350,
  type_paiement: 'total' as 'total' | 'echellonner',
  montant_verse: 0,
  date_vente: new Date().toISOString().split('T')[0],
});

const filteredClients = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  if (!query) {
    return clients.value;
  }

  return clients.value.filter((client) =>
    `${client.nom} ${client.prenom} ${client.telephone ?? ''}`.toLowerCase().includes(query)
  );
});

function openAddClientModal(): void {
  isAddClientOpen.value = true;
}

function closeAddClientModal(): void {
  isAddClientOpen.value = false;
}

function saveClient(): void {
  if (!clientForm.value.nom.trim() || !clientForm.value.prenom.trim()) {
    window.alert('Nom et prenom sont obligatoires.');
    return;
  }
  dataStore.addClientOffline(clientForm.value);
  clientForm.value = { nom: '', prenom: '', telephone: '', adresse: '' };
  closeAddClientModal();
}

function openVenteModal(client: LocalClient): void {
  selectedClient.value = client;
  venteForm.value = {
    type_vente: 'usine',
    quantite: 1,
    prix_unitaire: 350,
    type_paiement: 'total',
    montant_verse: 0,
    date_vente: new Date().toISOString().split('T')[0],
  };
  isVenteOpen.value = true;
}

function closeVenteModal(): void {
  isVenteOpen.value = false;
  selectedClient.value = null;
}

function saveVente(): void {
  if (!selectedClient.value) {
    return;
  }
  if (!authStore.state.user?.id) {
    window.alert('Session utilisateur invalide.');
    return;
  }
  if (venteForm.value.quantite <= 0 || venteForm.value.prix_unitaire <= 0) {
    window.alert('Quantite et prix unitaire doivent etre superieurs a 0.');
    return;
  }
  if (venteForm.value.type_paiement === 'echellonner' && venteForm.value.montant_verse <= 0) {
    window.alert('Veuillez renseigner un montant verse.');
    return;
  }
  const total = Number(venteForm.value.quantite) * Number(venteForm.value.prix_unitaire);
  if (venteForm.value.type_paiement === 'echellonner' && Number(venteForm.value.montant_verse) > total) {
    window.alert('Le montant verse ne peut pas depasser le total de la vente.');
    return;
  }

  try {
    dataStore.addVenteOffline({
      userId: authStore.state.user.id,
      client: selectedClient.value,
      type_vente: venteForm.value.type_vente,
      quantite: venteForm.value.quantite,
      prix_unitaire: venteForm.value.prix_unitaire,
      type_paiement: venteForm.value.type_paiement,
      date_vente: venteForm.value.date_vente,
      montant_verse: venteForm.value.montant_verse,
    });
    closeVenteModal();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Erreur lors de la creation de la vente.');
  }
}

async function deleteClient(client: LocalClient): Promise<void> {
  const confirmed = window.confirm(`Supprimer le client ${client.nom} ${client.prenom} ?`);
  if (!confirmed) {
    return;
  }

  try {
    const token = navigator.onLine ? authStore.state.token ?? undefined : undefined;
    await dataStore.deleteClient(client.id, token);
    window.alert('Client supprime.');
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
  }
}
</script>

<style scoped>
.add-btn {
  --background: #1e88e5;
  --border-radius: 10px;
  margin: 8px 0 14px;
}
</style>
