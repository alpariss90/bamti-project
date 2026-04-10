<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/clients" text="" />
        </ion-buttons>
        <ion-title class="bamti-title">{{ isEditing ? 'Modifier client' : 'Nouveau client' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <div class="form-wrapper">
        <div class="form-card">
          <!-- Nom -->
          <div class="field-group">
            <label class="field-label">Nom <span class="required">*</span></label>
            <ion-input
              v-model="form.nom"
              placeholder="Nom de famille"
              class="field-input"
              :class="{ 'field-error': errors.nom }"
              @ionInput="errors.nom = ''"
            />
            <p v-if="errors.nom" class="error-msg">{{ errors.nom }}</p>
          </div>

          <!-- Prénom -->
          <div class="field-group">
            <label class="field-label">Prénom <span class="required">*</span></label>
            <ion-input
              v-model="form.prenom"
              placeholder="Prénom"
              class="field-input"
              :class="{ 'field-error': errors.prenom }"
              @ionInput="errors.prenom = ''"
            />
            <p v-if="errors.prenom" class="error-msg">{{ errors.prenom }}</p>
          </div>

          <!-- Téléphone -->
          <div class="field-group">
            <label class="field-label">Téléphone</label>
            <ion-input
              v-model="form.telephone"
              placeholder="Ex: 70 12 34 56"
              type="tel"
              class="field-input"
            />
          </div>

          <!-- Adresse -->
          <div class="field-group">
            <label class="field-label">Adresse</label>
            <ion-input
              v-model="form.adresse"
              placeholder="Quartier, ville..."
              class="field-input"
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
            {{ saving ? 'Enregistrement...' : (isEditing ? 'Modifier' : 'Enregistrer') }}
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
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonBackButton, IonContent,
  IonInput, IonButton, IonIcon, IonToast,
} from '@ionic/vue';
import { saveOutline } from 'ionicons/icons';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { db, type LocalClient, today } from '../services/db';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const router    = useRouter();
const route     = useRoute();
const authStore = useAuthStore();
const saving    = ref(false);

const toast = reactive({ show: false, message: '', color: 'success' });
const errors = reactive({ nom: '', prenom: '' });

// id_local optionnel (undefined si nouveau)
const idLocal = computed(() => {
  const p = route.params.id;
  return p ? Number(p) : undefined;
});
const isEditing = computed(() => idLocal.value !== undefined);

const form = reactive({ nom: '', prenom: '', telephone: '', adresse: '' });

// Charger les données si modification
onMounted(async () => {
  if (isEditing.value && idLocal.value !== undefined) {
    const client = await db.clients.get(idLocal.value);
    if (client) {
      form.nom       = client.nom;
      form.prenom    = client.prenom;
      form.telephone = client.telephone || '';
      form.adresse   = client.adresse   || '';
    }
  }
});

// ── Enregistrement ──────────────────────────────────────────────────────────
async function enregistrer() {
  // Validation
  errors.nom    = form.nom.trim()    ? '' : 'Le nom est obligatoire.';
  errors.prenom = form.prenom.trim() ? '' : 'Le prénom est obligatoire.';
  if (errors.nom || errors.prenom) return;

  saving.value = true;
  try {
    const data: Partial<LocalClient> = {
      nom:       form.nom.trim(),
      prenom:    form.prenom.trim(),
      telephone: form.telephone.trim() || null,
      adresse:   form.adresse.trim()   || null,
    };

    if (isEditing.value && idLocal.value !== undefined) {
      // Modifier
      const existing = await db.clients.get(idLocal.value);
      if (!existing) {
        toast.message = 'Client introuvable.';
        toast.color   = 'danger';
        toast.show    = true;
        return;
      }
      await db.clients.update(idLocal.value, { ...data, modifie: true, synced: false });

      // Si client serveur, tenter la mise à jour en ligne
      if (existing.id_serveur) {
        try {
          await api.put(`/api/mobile/clients/${existing.id_serveur}`, data);
          await db.clients.update(idLocal.value, { synced: true });
        } catch { /* sera synchro plus tard */ }
      }

      toast.message = 'Client modifié.';
    } else {
      // Créer localement
      const newClient: LocalClient = {
        ...data as LocalClient,
        id_serveur:          null,
        cree_par_revendeur:  true,
        modifie:             false,
        synced:              false,
      };

      const idLocal = await db.clients.add(newClient);

      // Tenter création en ligne
      try {
        const { data: resData } = await api.post('/api/mobile/clients', data);
        if (resData.success) {
          await db.clients.update(idLocal, {
            id_serveur: resData.client.id,
            synced:     true,
          });
        }
      } catch { /* mode offline, sera synchro */ }

      toast.message = 'Client ajouté.';
    }

    toast.color = 'success';
    toast.show  = true;

    setTimeout(() => router.replace('/clients'), 1200);
  } catch (err: unknown) {
    const apiErr = err as { response?: { data?: { message?: string } } };
    toast.message = apiErr?.response?.data?.message ?? 'Erreur lors de l\'enregistrement.';
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

.form-wrapper {
  padding: 20px 16px;
}

.form-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 2px 12px rgba(26, 159, 224, 0.1);
}

.field-group {
  margin-bottom: 18px;
}

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

.field-error {
  border-color: var(--ion-color-danger) !important;
}

.error-msg {
  color: var(--ion-color-danger);
  font-size: 0.75rem;
  margin: 4px 0 0 4px;
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
