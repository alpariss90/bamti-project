<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button color="light" />
        </ion-buttons>
        <ion-title class="bamti-title">Ma recette du jour</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/ventes/nouvelle')" color="light">
            <ion-icon :icon="addOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <ion-refresher slot="fixed" @ionRefresh="charger($event)">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Date du jour -->
      <div class="date-banner">
        <ion-icon :icon="calendarOutline" />
        <span>{{ dateDuJour }}</span>
      </div>

      <!-- Totaux -->
      <div class="totaux-grid">
        <div class="totaux-card blue">
          <div class="totaux-val">{{ fmtF(totaux.totalVente) }}</div>
          <div class="totaux-lbl">Total ventes</div>
        </div>
        <div class="totaux-card green">
          <div class="totaux-val">{{ fmtF(totaux.totalEncaisse) }}</div>
          <div class="totaux-lbl">Encaissé</div>
        </div>
        <div class="totaux-card red">
          <div class="totaux-val">{{ fmtF(totaux.totalReste) }}</div>
          <div class="totaux-lbl">Reste</div>
        </div>
        <div class="totaux-card orange">
          <div class="totaux-val">{{ fmtF(totaux.gainRevendeur) }}</div>
          <div class="totaux-lbl">Mon gain<br>({{ totaux.totalQte }} sac. × {{ fmtF(authStore.gainParSachet) }})</div>
        </div>
      </div>

      <!-- Liste des ventes du jour -->
      <div v-if="ventes.length === 0" class="empty-state">
        <ion-icon :icon="receiptOutline" class="empty-icon" />
        <p>Aucune vente aujourd'hui</p>
        <ion-button fill="outline" @click="router.push('/ventes/nouvelle')">
          <ion-icon :icon="addOutline" slot="start" />
          Enregistrer une vente
        </ion-button>
      </div>

      <div v-else class="section-title">Ventes du jour</div>

      <ion-list class="vente-list">
        <ion-item-sliding v-for="v in ventes" :key="v.id_local">
          <ion-item class="vente-item">
            <ion-label>
              <div class="vente-header">
                <span class="vente-client">{{ nomClient(v.id_client) }}</span>
                <span class="vente-total">{{ fmtF(v.montant_total) }}</span>
              </div>
              <div class="vente-details">
                <span>{{ v.quantite }} sac. × {{ fmtF(v.prix_unitaire) }}</span>
                <ion-badge :color="v.type_paiement === 'total' ? 'success' : 'warning'" class="pay-badge">
                  {{ v.type_paiement === 'total' ? 'Soldé' : 'Échelonné' }}
                </ion-badge>
              </div>
              <div v-if="v.type_paiement === 'echellonner'" class="vente-encaisse">
                Encaissé: {{ fmtF(v.montant_paye) }} — Reste: {{ fmtF(v.montant_total - v.montant_paye) }}
              </div>
            </ion-label>
          </ion-item>

          <!-- Actions glissantes : modifier + supprimer (même jour) -->
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmerSuppression(v)">
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
      header="Supprimer la vente"
      message="Supprimer définitivement cette vente ?"
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
  IonRefresher, IonRefresherContent, IonAlert, IonToast,
} from '@ionic/vue';
import { addOutline, calendarOutline, receiptOutline, trashOutline } from 'ionicons/icons';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { db, type LocalVente, ventesJour, calculTotaux } from '../services/db';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const router    = useRouter();
const authStore = useAuthStore();
const ventes    = ref<LocalVente[]>([]);
const clients   = ref<Record<number, string>>({});

interface Totaux { totalVente: number; totalEncaisse: number; totalReste: number; totalQte: number; gainRevendeur: number; }
const totaux = reactive<Totaux>({ totalVente: 0, totalEncaisse: 0, totalReste: 0, totalQte: 0, gainRevendeur: 0 });

const toast = reactive({ show: false, message: '', color: 'success' });
const showDeleteAlert  = ref(false);
const venteASupprimer  = ref<LocalVente | null>(null);

const dateDuJour = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
);

onMounted(() => charger());

async function charger(ev?: CustomEvent) {
  // Charger les noms des clients
  const allClients = await db.clients.toArray();
  clients.value = Object.fromEntries(
    allClients.map(c => [c.id_local!, `${c.nom} ${c.prenom}`])
  );

  ventes.value = await ventesJour();

  // Calculer les totaux
  const t = await calculTotaux(ventes.value, authStore.gainParSachet);
  Object.assign(totaux, t);

  if (ev) (ev.target as HTMLIonRefresherElement).complete();
}

function nomClient(idLocal: number): string {
  return clients.value[idLocal] || 'Client inconnu';
}

function fmtF(n: number): string {
  return (n || 0).toLocaleString('fr-FR') + ' F';
}

// ── Suppression ─────────────────────────────────────────────────────────────
function confirmerSuppression(v: LocalVente) {
  venteASupprimer.value = v;
  showDeleteAlert.value = true;
}

const deleteButtons = [
  { text: 'Annuler', role: 'cancel' },
  {
    text: 'Supprimer',
    role: 'confirm',
    handler: () => supprimerVente(),
  },
];

async function supprimerVente() {
  const v = venteASupprimer.value;
  if (!v?.id_local) return;

  try {
    // Supprimer les paiements locaux
    await db.paiements.where('id_vente_local').equals(v.id_local).delete();
    // Supprimer la vente locale
    await db.ventes.delete(v.id_local);

    // Tenter suppression en ligne
    if (v.id_serveur) {
      try {
        await api.delete(`/api/mobile/ventes/${v.id_serveur}`);
      } catch { /* sera gérée lors de la sync */ }
    }

    await charger();
    toast.message = 'Vente supprimée.';
    toast.color   = 'success';
    toast.show    = true;
  } catch {
    toast.message = 'Erreur lors de la suppression.';
    toast.color   = 'danger';
    toast.show    = true;
  }
}
</script>

<style scoped>
.bamti-toolbar { --background: #1B2A6B; --color: #fff; }
.bamti-title   { font-weight: 700; color: #fff; }
.page-content  { --background: #f0f7ff; }

.date-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #fff;
  color: #1B2A6B;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid #e0eaf5;
}

/* ── Totaux ── */
.totaux-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 14px 4px;
}

.totaux-card {
  border-radius: 14px;
  padding: 14px 12px;
  text-align: center;
  color: #fff;
}

.totaux-card.blue   { background: linear-gradient(135deg, #1A9FE0, #1B2A6B); }
.totaux-card.green  { background: linear-gradient(135deg, #27AE60, #1e7e44); }
.totaux-card.red    { background: linear-gradient(135deg, #E74C3C, #922b21); }
.totaux-card.orange { background: linear-gradient(135deg, #F39C12, #c27d10); }

.totaux-val { font-size: 1.05rem; font-weight: 700; }
.totaux-lbl { font-size: 0.7rem; opacity: 0.85; margin-top: 4px; }

/* ── Section ── */
.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ion-color-medium);
  padding: 14px 20px 6px;
}

/* ── Liste ventes ── */
.vente-list { background: transparent; padding: 8px; }

.vente-item {
  --background: #fff;
  --border-radius: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(26,159,224,0.08);
}

.vente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vente-client { font-weight: 600; color: #1B2A6B; font-size: 0.95rem; }
.vente-total  { font-weight: 700; color: #1A9FE0; font-size: 1rem; }

.vente-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.pay-badge { font-size: 0.65rem; }

.vente-encaisse {
  font-size: 0.75rem;
  color: var(--ion-color-warning-shade);
  margin-top: 4px;
  font-weight: 500;
}

/* ── Empty ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  gap: 12px;
  color: var(--ion-color-medium);
}
.empty-icon { font-size: 56px; opacity: 0.4; }
</style>
