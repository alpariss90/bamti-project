<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button color="light" />
        </ion-buttons>
        <ion-title class="bamti-title">Ventes non soldées</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <ion-refresher slot="fixed" @ionRefresh="charger($event)">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Résumé -->
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-val red">{{ fmtF(totalReste) }}</span>
          <span class="summary-lbl">Reste à encaisser</span>
        </div>
        <div class="summary-sep" />
        <div class="summary-item">
          <span class="summary-val">{{ redevables.length }}</span>
          <span class="summary-lbl">Ventes en attente</span>
        </div>
      </div>

      <!-- Vide -->
      <div v-if="redevables.length === 0" class="empty-state">
        <ion-icon :icon="checkmarkCircleOutline" class="empty-icon green" />
        <p>Aucune vente non soldée 🎉</p>
      </div>

      <!-- Liste -->
      <ion-list v-else class="vente-list">
        <ion-item v-for="v in redevables" :key="v.id_local" class="vente-item">
          <ion-label>
            <div class="vente-header">
              <span class="vente-client">{{ nomClient(v.id_client) }}</span>
              <span class="vente-date">{{ fmtDate(v.date_vente) }}</span>
            </div>
            <div class="vente-details">
              {{ v.quantite }} sac. × {{ fmtF(v.prix_unitaire) }} = <strong>{{ fmtF(v.montant_total) }}</strong>
            </div>
            <div class="vente-paiements">
              <span class="pay-ok">Payé : {{ fmtF(totalPayeVente(v)) }}</span>
              <span class="pay-reste">Reste : {{ fmtF(v.reste) }}</span>
            </div>
          </ion-label>
          <ion-button slot="end" fill="solid" size="small" color="success" @click="ouvrirPaiement(v)">
            <ion-icon :icon="cashOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>

    <!-- Modal paiement partiel -->
    <ion-modal :is-open="showPaiementModal" @didDismiss="showPaiementModal = false" :breakpoints="[0, 0.5, 0.75]" :initial-breakpoint="0.5">
      <div class="modal-content">
        <div class="modal-handle" />
        <h3 class="modal-title">Encaisser un paiement</h3>

        <div v-if="venteSelectionnee" class="modal-info">
          <p><strong>Client :</strong> {{ nomClient(venteSelectionnee.id_client) }}</p>
          <p><strong>Reste à payer :</strong> <span class="red bold">{{ fmtF(venteSelectionnee.reste) }}</span></p>
        </div>

        <div class="field-group">
          <label class="field-label">Montant encaissé (FCFA) <span class="required">*</span></label>
          <ion-input
            v-model.number="montantPaiement"
            type="number"
            min="1"
            :max="venteSelectionnee?.reste"
            placeholder="Ex: 5000"
            class="field-input"
          />
        </div>

        <div class="modal-actions">
          <ion-button fill="outline" @click="showPaiementModal = false">Annuler</ion-button>
          <ion-button color="success" :disabled="saving" @click="enregistrerPaiement">
            <ion-icon :icon="saveOutline" slot="start" />
            {{ saving ? '...' : 'Encaisser' }}
          </ion-button>
        </div>
      </div>
    </ion-modal>

    <!-- Toast -->
    <ion-toast
      :is-open="toast.show"
      :message="toast.message"
      :color="toast.color"
      :duration="3000"
      @didDismiss="toast.show = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonList, IonItem, IonLabel, IonIcon, IonButton,
  IonRefresher, IonRefresherContent, IonModal, IonInput, IonToast,
} from '@ionic/vue';
import { cashOutline, checkmarkCircleOutline, saveOutline } from 'ionicons/icons';
import { ref, reactive, computed, onMounted } from 'vue';
import { db, type LocalVente, type LocalPaiement, ventesRedevables, today } from '../services/db';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const authStore = useAuthStore();
const saving    = ref(false);
const toast     = reactive({ show: false, message: '', color: 'success' });

interface VenteRedevable extends LocalVente { reste: number; paiements: LocalPaiement[]; }
const redevables = ref<VenteRedevable[]>([]);
const clients    = ref<Record<number, string>>({});

// Modal paiement
const showPaiementModal  = ref(false);
const venteSelectionnee  = ref<VenteRedevable | null>(null);
const montantPaiement    = ref(0);

const totalReste = computed(() =>
  redevables.value.reduce((s, v) => s + v.reste, 0)
);

onMounted(() => charger());

async function charger(ev?: CustomEvent) {
  const allClients = await db.clients.toArray();
  clients.value = Object.fromEntries(
    allClients.map(c => [c.id_local!, `${c.nom} ${c.prenom}`])
  );
  redevables.value = await ventesRedevables();
  if (ev) (ev.target as HTMLIonRefresherElement).complete();
}

function nomClient(idLocal: number): string {
  return clients.value[idLocal] || 'Client inconnu';
}

function fmtF(n: number): string {
  return (n || 0).toLocaleString('fr-FR') + ' F';
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function totalPayeVente(v: VenteRedevable): number {
  return v.paiements.reduce((s, p) => s + p.montant, 0);
}

// ── Paiement modal ───────────────────────────────────────────────────────────
function ouvrirPaiement(v: VenteRedevable) {
  venteSelectionnee.value = v;
  montantPaiement.value   = 0;
  showPaiementModal.value = true;
}

async function enregistrerPaiement() {
  const v = venteSelectionnee.value;
  if (!v || !montantPaiement.value || montantPaiement.value <= 0) {
    toast.message = 'Montant invalide.';
    toast.color   = 'danger';
    toast.show    = true;
    return;
  }
  if (montantPaiement.value > v.reste) {
    toast.message = `Le montant dépasse le reste (${fmtF(v.reste)}).`;
    toast.color   = 'danger';
    toast.show    = true;
    return;
  }

  saving.value = true;
  try {
    const dateAuj = today();

    // Créer paiement local
    const paiement: LocalPaiement = {
      id_serveur:      null,
      id_vente_local:  v.id_local!,
      id_vente_serveur: v.id_serveur ?? null,
      montant:         montantPaiement.value,
      date:            dateAuj,
      observation:     null,
      synced:          false,
    };
    const idPaiement = await db.paiements.add(paiement);

    // Mettre à jour montant_paye dans la vente locale
    const nouveauMontantPaye = totalPayeVente(v) + montantPaiement.value;
    const nouveauType = nouveauMontantPaye >= v.montant_total ? 'total' : 'echellonner';
    await db.ventes.update(v.id_local!, {
      montant_paye:  nouveauMontantPaye,
      type_paiement: nouveauType,
      synced:        false,
    });

    // Tentative envoi en ligne
    if (v.id_serveur) {
      try {
        const { data } = await api.post('/api/mobile/paiements', {
          id_vente:    v.id_serveur,
          montant:     montantPaiement.value,
          observation: null,
        });
        if (data.success) {
          await db.paiements.update(idPaiement, { id_serveur: data.paiement.id, synced: true });
        }
      } catch { /* offline */ }
    }

    showPaiementModal.value = false;
    await charger();
    toast.message = 'Paiement enregistré !';
    toast.color   = 'success';
    toast.show    = true;
  } catch {
    toast.message = 'Erreur lors de l\'enregistrement.';
    toast.color   = 'danger';
    toast.show    = true;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.bamti-toolbar { --background: #1B2A6B; --color: #fff; }
.bamti-title   { font-weight: 700; color: #fff; }
.page-content  { --background: #f0f7ff; }

.summary-card {
  display: flex;
  align-items: center;
  background: #fff;
  margin: 14px;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(26,159,224,0.08);
}

.summary-item { flex: 1; text-align: center; }
.summary-val  { display: block; font-size: 1.2rem; font-weight: 700; color: #1B2A6B; }
.summary-val.red { color: var(--ion-color-danger); }
.summary-lbl  { font-size: 0.72rem; color: var(--ion-color-medium); margin-top: 3px; display: block; }
.summary-sep  { width: 1px; height: 40px; background: #e0eaf5; }

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

.vente-client { font-weight: 600; color: #1B2A6B; font-size: 0.9rem; }
.vente-date   { font-size: 0.75rem; color: var(--ion-color-medium); }
.vente-details { font-size: 0.8rem; color: var(--ion-color-medium); margin-top: 3px; }
.vente-paiements { display: flex; gap: 12px; margin-top: 4px; font-size: 0.78rem; }
.pay-ok    { color: var(--ion-color-success); font-weight: 600; }
.pay-reste { color: var(--ion-color-danger);  font-weight: 600; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.empty-icon { font-size: 56px; opacity: 0.6; }
.empty-icon.green { color: var(--ion-color-success); }

/* ── Modal ── */
.modal-content {
  padding: 20px 24px 32px;
}

.modal-handle {
  width: 40px;
  height: 4px;
  background: #d0dff0;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1B2A6B;
  margin-bottom: 12px;
}

.modal-info { font-size: 0.9rem; margin-bottom: 16px; color: #444; }
.red  { color: var(--ion-color-danger); }
.bold { font-weight: 700; }

.field-group { margin-bottom: 16px; }

.field-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1B2A6B;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.required { color: var(--ion-color-danger); }

.field-input {
  --background: #f0f7ff;
  --border-radius: 10px;
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  border-radius: 10px;
  border: 1px solid #d0e6f5;
  font-size: 0.95rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
