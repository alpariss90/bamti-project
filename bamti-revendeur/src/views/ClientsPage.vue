<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button color="light" />
        </ion-buttons>
        <ion-title class="bamti-title">Clients</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/clients/nouveau')" color="light">
            <ion-icon :icon="personAddOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <!-- Barre de recherche -->
      <ion-toolbar class="search-toolbar">
        <ion-searchbar
          v-model="recherche"
          placeholder="Rechercher un client..."
          :debounce="200"
          class="bamti-searchbar"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <!-- Liste des clients -->
      <ion-refresher slot="fixed" @ionRefresh="rafraichir($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="clientsFiltres.length === 0" class="empty-state">
        <ion-icon :icon="peopleOutline" class="empty-icon" />
        <p>{{ recherche ? 'Aucun client trouvé' : 'Aucun client enregistré' }}</p>
        <ion-button fill="outline" @click="router.push('/clients/nouveau')">
          <ion-icon :icon="personAddOutline" slot="start" />
          Ajouter un client
        </ion-button>
      </div>

      <ion-list v-else class="client-list">
        <ion-item-sliding v-for="client in clientsFiltres" :key="client.id_local">
          <ion-item class="client-item" @click="voirClient(client)">
            <div class="client-avatar" slot="start">
              <span>{{ initiales(client) }}</span>
            </div>
            <ion-label>
              <h2 class="client-nom">{{ client.nom }} {{ client.prenom }}</h2>
              <p v-if="client.telephone" class="client-tel">
                <ion-icon :icon="callOutline" /> {{ client.telephone }}
              </p>
              <p v-if="client.adresse" class="client-addr">
                <ion-icon :icon="locationOutline" /> {{ client.adresse }}
              </p>
            </ion-label>
            <ion-badge v-if="!client.synced" color="warning" slot="end">Local</ion-badge>
          </ion-item>

          <!-- Actions glissantes (uniquement pour les clients créés par le revendeur) -->
          <ion-item-options v-if="client.cree_par_revendeur" side="end">
            <ion-item-option color="primary" @click="modifierClient(client)">
              <ion-icon :icon="createOutline" slot="icon-only" />
            </ion-item-option>
            <ion-item-option color="danger" @click="confirmerSuppression(client)">
              <ion-icon :icon="trashOutline" slot="icon-only" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>

    <!-- Toast -->
    <ion-toast
      :is-open="toast.show"
      :message="toast.message"
      :color="toast.color"
      :duration="3000"
      @didDismiss="toast.show = false"
    />

    <!-- Alert suppression -->
    <ion-alert
      :is-open="showDeleteAlert"
      header="Supprimer le client"
      :message="`Supprimer ${clientASupprimer?.nom} ${clientASupprimer?.prenom} ?`"
      :buttons="deleteButtons"
      @didDismiss="showDeleteAlert = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonMenuButton, IonContent, IonList, IonItem, IonItemSliding,
  IonItemOptions, IonItemOption, IonLabel, IonIcon, IonBadge,
  IonSearchbar, IonRefresher, IonRefresherContent,
  IonAlert, IonToast,
} from '@ionic/vue';
import {
  personAddOutline, peopleOutline, callOutline, locationOutline,
  createOutline, trashOutline,
} from 'ionicons/icons';
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { db, type LocalClient } from '../services/db';

const router    = useRouter();
const recherche = ref('');
const clients   = ref<LocalClient[]>([]);

const toast = reactive({ show: false, message: '', color: 'success' });
const showDeleteAlert     = ref(false);
const clientASupprimer    = ref<LocalClient | null>(null);

// ── Chargement ──────────────────────────────────────────────────────────────
onMounted(() => chargerClients());

async function chargerClients() {
  clients.value = await db.clients
    .filter(c => !c.deletedAt)
    .sortBy('nom');
}

async function rafraichir(ev: CustomEvent) {
  await chargerClients();
  (ev.target as HTMLIonRefresherElement).complete();
}

// ── Filtrage ────────────────────────────────────────────────────────────────
const clientsFiltres = computed(() => {
  const q = recherche.value.toLowerCase().trim();
  if (!q) return clients.value;
  return clients.value.filter(c =>
    `${c.nom} ${c.prenom}`.toLowerCase().includes(q) ||
    (c.telephone || '').includes(q)
  );
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function initiales(c: LocalClient) {
  return `${c.nom.charAt(0)}${c.prenom.charAt(0)}`.toUpperCase();
}

function voirClient(client: LocalClient) {
  // Navigation vers la fiche client (future page)
  modifierClient(client);
}

function modifierClient(client: LocalClient) {
  router.push(`/clients/modifier/${client.id_local}`);
}

// ── Suppression ─────────────────────────────────────────────────────────────
function confirmerSuppression(client: LocalClient) {
  clientASupprimer.value = client;
  showDeleteAlert.value  = true;
}

const deleteButtons = [
  { text: 'Annuler', role: 'cancel' },
  {
    text: 'Supprimer',
    role: 'confirm',
    cssClass: 'alert-danger',
    handler: () => supprimerClient(),
  },
];

async function supprimerClient() {
  const client = clientASupprimer.value;
  if (!client?.id_local) return;

  // Vérifier qu'il n'a pas de vente locale
  const nbVentes = await db.ventes.where('id_client').equals(client.id_local).count();
  if (nbVentes > 0) {
    toast.message = 'Impossible : ce client a des ventes associées.';
    toast.color   = 'danger';
    toast.show    = true;
    return;
  }

  if (client.id_serveur) {
    // Marquer comme supprimé (sera synchro)
    await db.clients.update(client.id_local, {
      deletedAt: new Date().toISOString(),
      synced: false
    } as unknown as LocalClient);
  } else {
    // Créé seulement en local → supprimer définitivement
    await db.clients.delete(client.id_local);
  }

  await chargerClients();
  toast.message = 'Client supprimé.';
  toast.color   = 'success';
  toast.show    = true;
}
</script>

<style scoped>
.bamti-toolbar { --background: #1B2A6B; --color: #fff; }
.bamti-title   { font-weight: 700; color: #fff; }
.search-toolbar { --background: #fff; --border-color: #e0eaf5; }
.bamti-searchbar { --background: #f0f7ff; }
.page-content  { --background: #f0f7ff; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 12px;
  color: var(--ion-color-medium);
}
.empty-icon { font-size: 56px; opacity: 0.4; }

.client-list { background: transparent; padding: 8px; }

.client-item {
  --background: #fff;
  --border-radius: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(26,159,224,0.08);
}

.client-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1A9FE0, #1B2A6B);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.client-nom  { font-weight: 600; color: #1B2A6B; }
.client-tel, .client-addr {
  font-size: 0.78rem;
  color: var(--ion-color-medium);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
.client-tel ion-icon, .client-addr ion-icon { font-size: 12px; }
</style>
