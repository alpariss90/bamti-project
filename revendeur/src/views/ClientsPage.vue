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

      <div v-if="visibleClients.length" class="cards-grid">
        <ion-card v-for="client in visibleClients" :key="client.id" class="client-card">
          <ion-card-content>
            <div class="card-header-row">
              <div class="avatar">{{ initiales(client) }}</div>
              <div class="client-info">
                <h2 class="client-name">{{ client.nom }} {{ client.prenom }}</h2>
                <p class="client-detail">
                  <ion-icon :icon="callOutline" class="detail-icon" />
                  {{ client.telephone ?? '-' }}
                </p>
                <p class="client-detail">
                  <ion-icon :icon="locationOutline" class="detail-icon" />
                  {{ client.adresse ?? '-' }}
                </p>
              </div>
            </div>
            <div class="card-actions">
              <ion-button size="small" expand="block" class="btn-vente" @click="openVenteModal(client)">
                <ion-icon :icon="cartOutline" slot="start" />
                Vente
              </ion-button>
              <ion-button size="small" expand="block" fill="outline" color="danger" class="btn-suppr" @click="deleteClient(client)">
                <ion-icon :icon="trashOutline" slot="start" />
                Supprimer
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
      <div v-else class="empty-state">
        <ion-icon :icon="peopleOutline" class="empty-icon" />
        <p>Aucun client ne correspond a la recherche.</p>
      </div>

      <ion-infinite-scroll :disabled="displayedCount >= filteredClients.length" @ionInfinite="loadMore">
        <ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Chargement..." />
      </ion-infinite-scroll>

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
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonMenuButton,
  IonModal,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue';
import { callOutline, cartOutline, locationOutline, peopleOutline, trashOutline } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import { authStore } from '@/stores/auth';
import type { LocalClient } from '@/types/data';
import { dataStore } from '@/stores/dataStore';

function initiales(client: LocalClient): string {
  return `${client.nom.charAt(0)}${client.prenom.charAt(0)}`.toUpperCase();
}

onIonViewWillEnter(async () => {
  await dataStore.hydrate();
});

const ionRouter = useIonRouter();
const clients = computed(() => dataStore.state.clients);
const searchTerm = ref('');
const isAddClientOpen = ref(false);
const isVenteOpen = ref(false);
const selectedClient = ref<LocalClient | null>(null);

const PAGE_SIZE = 20;
const displayedCount = ref(PAGE_SIZE);

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
  if (!query) return clients.value;
  return clients.value.filter((client) =>
    `${client.nom} ${client.prenom} ${client.telephone ?? ''}`.toLowerCase().includes(query)
  );
});

const visibleClients = computed(() => filteredClients.value.slice(0, displayedCount.value));

watch(searchTerm, () => { displayedCount.value = PAGE_SIZE; });

function loadMore(event: CustomEvent): void {
  displayedCount.value += PAGE_SIZE;
  (event.target as HTMLIonInfiniteScrollElement).complete();
}

function openAddClientModal(): void {
  isAddClientOpen.value = true;
}

function closeAddClientModal(): void {
  isAddClientOpen.value = false;
}

async function saveClient(): Promise<void> {
  if (!clientForm.value.nom.trim() || !clientForm.value.prenom.trim()) {
    window.alert('Nom et prenom sont obligatoires.');
    return;
  }
  await dataStore.addClientOffline(clientForm.value);
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

async function saveVente(): Promise<void> {
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
    await dataStore.addVenteOffline({
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
    ionRouter.navigate('/ventes', 'forward', 'push');
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Erreur lors de la creation de la vente.');
    console.log(error instanceof Error ? error.message : 'Erreur lors de la creation de la vente.');
    
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

/* Grille de cards */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  padding: 4px 0 16px;
}

.client-card {
  margin: 0;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* Ligne avatar + infos */
.card-header-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}

.avatar {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #1e88e5;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.client-info {
  flex: 1;
  min-width: 0;
}

.client-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-detail {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 2px 0;
}

.detail-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* Boutons d'action */
.card-actions {
  display: flex;
  gap: 8px;
}

.btn-vente {
  flex: 1;
  --background: #1e88e5;
  --border-radius: 8px;
}

.btn-suppr {
  flex: 1;
  --border-radius: 8px;
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
