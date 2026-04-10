<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/ventes" text="" />
        </ion-buttons>
        <ion-title class="bamti-title">Nouvelle vente</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <div class="form-wrapper">
        <div class="form-card">

          <!-- Client -->
          <div class="field-group">
            <label class="field-label">Client <span class="required">*</span></label>
            <select v-model="form.id_client" class="native-select" :class="{ 'field-error': errors.client }">
              <option value="">-- Sélectionner un client --</option>
              <option v-for="c in clients" :key="c.id_local" :value="c.id_local">
                {{ c.nom }} {{ c.prenom }}{{ c.telephone ? ` — ${c.telephone}` : '' }}
              </option>
            </select>
            <p v-if="errors.client" class="error-msg">{{ errors.client }}</p>
          </div>

          <!-- Quantité -->
          <div class="field-group">
            <label class="field-label">Nombre de sachets <span class="required">*</span></label>
            <ion-input
              v-model.number="form.quantite"
              type="number"
              min="1"
              placeholder="Ex: 10"
              class="field-input"
              :class="{ 'field-error': errors.quantite }"
              @ionInput="calculerTotal"
            />
            <p v-if="errors.quantite" class="error-msg">{{ errors.quantite }}</p>
          </div>

          <!-- Prix unitaire -->
          <div class="field-group">
            <label class="field-label">Prix unitaire (FCFA) <span class="required">*</span></label>
            <ion-input
              v-model.number="form.prix_unitaire"
              type="number"
              min="0"
              placeholder="Ex: 350"
              class="field-input"
              :class="{ 'field-error': errors.prix }"
              @ionInput="calculerTotal"
            />
            <p v-if="errors.prix" class="error-msg">{{ errors.prix }}</p>
          </div>

          <!-- Total calculé -->
          <div v-if="montantTotal > 0" class="total-box">
            <span class="total-label">Total</span>
            <span class="total-value">{{ montantTotal.toLocaleString('fr-FR') }} FCFA</span>
          </div>

          <!-- Montant payé -->
          <div class="field-group">
            <label class="field-label">Montant encaissé (FCFA)</label>
            <ion-input
              v-model.number="form.montant_paye"
              type="number"
              min="0"
              :max="montantTotal"
              placeholder="0"
              class="field-input"
              :class="{ 'field-error': errors.montant_paye }"
              @ionInput="errors.montant_paye = ''"
            />
            <p v-if="errors.montant_paye" class="error-msg">{{ errors.montant_paye }}</p>
            <p v-if="resteAPayer > 0" class="reste-info">
              Reste à payer : <strong>{{ resteAPayer.toLocaleString('fr-FR') }} FCFA</strong>
            </p>
          </div>

          <!-- Observation -->
          <div class="field-group">
            <label class="field-label">Observation</label>
            <ion-textarea
              v-model="form.observation"
              placeholder="Optionnel..."
              class="field-input field-textarea"
              :rows="2"
            />
          </div>

          <!-- Bouton enregistrer -->
          <ion-button
            expand="block"
            class="save-btn"
            :disabled="saving"
            @click="enregistrer"
          >
            <ion-icon :icon="saveOutline" slot="start" />
            {{ saving ? 'Enregistrement...' : 'Enregistrer la vente' }}
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            class="cancel-btn"
            @click="router.back()"
          >
            Annuler
          </ion-button>
        </div>
      </div>
    </ion-content>

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
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonInput, IonTextarea, IonButton, IonIcon, IonToast,
} from '@ionic/vue';
import { saveOutline } from 'ionicons/icons';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { db, type LocalClient, type LocalVente, type LocalPaiement, today } from '../services/db';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const router    = useRouter();
const authStore = useAuthStore();
const saving    = ref(false);
const clients   = ref<LocalClient[]>([]);

const toast = reactive({ show: false, message: '', color: 'success' });
const errors = reactive({ client: '', quantite: '', prix: '', montant_paye: '' });

const form = reactive({
  id_client:    '' as string | number,
  quantite:     0,
  prix_unitaire: 350,  // prix par défaut
  montant_paye: 0,
  observation:  '',
});

onMounted(async () => {
  clients.value = await db.clients.filter(c => !('deletedAt' in c && c.deletedAt)).sortBy('nom');
});

const montantTotal = computed(() =>
  (form.quantite || 0) * (form.prix_unitaire || 0)
);

const resteAPayer = computed(() =>
  Math.max(0, montantTotal.value - (form.montant_paye || 0))
);

function calculerTotal() {
  errors.quantite = '';
  errors.prix     = '';
}

// ── Enregistrement ──────────────────────────────────────────────────────────
async function enregistrer() {
  // Validation
  errors.client      = form.id_client          ? '' : 'Veuillez sélectionner un client.';
  errors.quantite    = (form.quantite > 0)     ? '' : 'Quantité doit être > 0.';
  errors.prix        = (form.prix_unitaire > 0) ? '' : 'Prix unitaire doit être > 0.';
  errors.montant_paye = (form.montant_paye || 0) <= montantTotal.value
    ? '' : 'Le montant encaissé ne peut pas dépasser le total.';

  if (errors.client || errors.quantite || errors.prix || errors.montant_paye) return;

  saving.value = true;
  try {
    const dateVente    = today();
    const typePaiement = (form.montant_paye || 0) >= montantTotal.value ? 'total' : 'echellonner';
    const clientLocal  = await db.clients.get(Number(form.id_client));

    // ── Enregistrement local (IndexedDB) ─────────────────────────────────
    const venteLocale: LocalVente = {
      id_serveur:          null,
      id_client:           Number(form.id_client),
      id_client_serveur:   clientLocal?.id_serveur ?? null,
      quantite:            form.quantite,
      prix_unitaire:       form.prix_unitaire,
      montant_total:       montantTotal.value,
      type_paiement:       typePaiement,
      montant_paye:        form.montant_paye || 0,
      date_vente:          dateVente,
      observation:         form.observation || null,
      synced:              false,
      date_created:        dateVente,
    };

    const idVenteLocal = await db.ventes.add(venteLocale);

    // Si montant payé > 0, créer un paiement local
    if ((form.montant_paye || 0) > 0) {
      const paiementLocal: LocalPaiement = {
        id_serveur:      null,
        id_vente_local:  idVenteLocal,
        id_vente_serveur: null,
        montant:         form.montant_paye,
        date:            dateVente,
        observation:     null,
        synced:          false,
      };
      await db.paiements.add(paiementLocal);
    }

    // ── Tentative d'envoi en ligne (non bloquant) ─────────────────────────
    try {
      const { data } = await api.post('/api/mobile/ventes', {
        id_client:     clientLocal?.id_serveur || form.id_client,
        quantite:      form.quantite,
        prix_unitaire: form.prix_unitaire,
        type_paiement: typePaiement,
        montant_paye:  form.montant_paye || 0,
        observation:   form.observation || null,
        date_vente:    dateVente,
      });
      if (data.success) {
        await db.ventes.update(idVenteLocal, { id_serveur: data.vente.id, synced: true });
      }
    } catch { /* offline — sera synchro */ }

    toast.message = 'Vente enregistrée avec succès !';
    toast.color   = 'success';
    toast.show    = true;
    setTimeout(() => router.replace('/ventes/jour'), 1200);
  } catch (err) {
    console.error(err);
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

.form-wrapper { padding: 20px 16px; }

.form-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 2px 12px rgba(26, 159, 224, 0.1);
}

.field-group  { margin-bottom: 18px; }

.field-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1B2A6B;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.required { color: var(--ion-color-danger); }

.native-select {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #d0e6f5;
  border-radius: 10px;
  background: #f0f7ff;
  font-size: 0.95rem;
  color: #1B2A6B;
  appearance: auto;
}

.native-select.field-error { border-color: var(--ion-color-danger); }

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

.field-textarea { min-height: 60px; }
.field-error { border-color: var(--ion-color-danger) !important; }
.error-msg   { color: var(--ion-color-danger); font-size: 0.75rem; margin: 4px 0 0 4px; }

.total-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1A9FE0, #1B2A6B);
  color: #fff;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 18px;
}
.total-label { font-size: 0.85rem; opacity: 0.85; }
.total-value { font-size: 1.2rem; font-weight: 700; }

.reste-info {
  font-size: 0.8rem;
  color: var(--ion-color-warning-shade);
  margin: 6px 0 0 4px;
}

.save-btn {
  margin-top: 24px;
  --border-radius: 12px;
  height: 48px;
  font-weight: 600;
  --background: #1A9FE0;
}

.cancel-btn {
  margin-top: 10px;
  --border-radius: 12px;
  height: 44px;
  --color: #1B2A6B;
  --border-color: #1B2A6B;
}
</style>
