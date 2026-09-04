<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Changer mon mot de passe</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Alerte offline -->
      <div v-if="!isOnline" class="msg msg-warning">
        <ion-icon :icon="wifiOutline" />
        Connexion internet requise pour changer le mot de passe.
      </div>

      <ion-card class="form-card">
        <ion-card-content>

          <ion-item class="field">
            <ion-input
              v-model="form.actuel"
              :type="showActuel ? 'text' : 'password'"
              label="Mot de passe actuel"
              label-placement="stacked"
              placeholder="••••••"
            />
            <ion-button fill="clear" slot="end" @click="showActuel = !showActuel">
              <ion-icon :icon="showActuel ? eyeOffOutline : eyeOutline" />
            </ion-button>
          </ion-item>

          <ion-item class="field">
            <ion-input
              v-model="form.nouveau"
              :type="showNouveau ? 'text' : 'password'"
              label="Nouveau mot de passe"
              label-placement="stacked"
              placeholder="••••••"
            />
            <ion-button fill="clear" slot="end" @click="showNouveau = !showNouveau">
              <ion-icon :icon="showNouveau ? eyeOffOutline : eyeOutline" />
            </ion-button>
          </ion-item>

          <ion-item class="field">
            <ion-input
              v-model="form.confirmation"
              :type="showConfirm ? 'text' : 'password'"
              label="Confirmer le nouveau mot de passe"
              label-placement="stacked"
              placeholder="••••••"
            />
            <ion-button fill="clear" slot="end" @click="showConfirm = !showConfirm">
              <ion-icon :icon="showConfirm ? eyeOffOutline : eyeOutline" />
            </ion-button>
          </ion-item>

          <div v-if="erreur" class="msg msg-error">
            <ion-icon :icon="alertCircleOutline" />
            {{ erreur }}
          </div>

          <div v-if="succes" class="msg msg-success">
            <ion-icon :icon="checkmarkCircleOutline" />
            {{ succes }}
          </div>

          <ion-button
            expand="block"
            class="btn-submit"
            :disabled="loading || !isOnline"
            @click="changer"
          >
            <ion-spinner v-if="loading" name="crescent" class="ion-margin-end" />
            <ion-icon v-else :icon="lockClosedOutline" slot="start" />
            {{ loading ? 'Modification...' : 'Changer le mot de passe' }}
          </ion-button>

        </ion-card-content>
      </ion-card>

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
  IonInput,
  IonItem,
  IonMenuButton,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  wifiOutline,
} from 'ionicons/icons';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { authStore } from '@/stores/auth';
import { authService } from '@/services/authService';
import { localAuthStorage } from '@/services/localAuthStorage';

const router = useRouter();

const form = reactive({ actuel: '', nouveau: '', confirmation: '' });
const loading    = ref(false);
const erreur     = ref('');
const succes     = ref('');
const isOnline   = ref(navigator.onLine);
const showActuel  = ref(false);
const showNouveau = ref(false);
const showConfirm = ref(false);

onIonViewWillEnter(() => {
  isOnline.value = navigator.onLine;
  erreur.value  = '';
  succes.value  = '';
  form.actuel   = '';
  form.nouveau  = '';
  form.confirmation = '';
});

async function changer(): Promise<void> {
  erreur.value = '';
  succes.value = '';

  if (!form.actuel || !form.nouveau || !form.confirmation) {
    erreur.value = 'Veuillez remplir tous les champs.';
    return;
  }

  if (form.nouveau.length < 4) {
    erreur.value = 'Le nouveau mot de passe doit contenir au moins 4 caractères.';
    return;
  }

  if (form.nouveau !== form.confirmation) {
    erreur.value = 'Le nouveau mot de passe et la confirmation ne correspondent pas.';
    return;
  }

  if (!authStore.state.token) {
    erreur.value = 'Session invalide. Veuillez vous reconnecter.';
    return;
  }

  loading.value = true;
  try {
    // 1. Appel API — si le serveur ne répond pas, une exception est levée
    const response = await authService.changePassword(
      authStore.state.token,
      form.actuel,
      form.nouveau,
    );

    // 2. Mise à jour du cache offline local avec les nouveaux hashes renvoyés par le serveur
    if (response.users?.length) {
      localAuthStorage.saveOfflineUsers(
        response.users.filter((u) => Boolean(u.password_hash)),
      );
    }

    succes.value = 'Mot de passe modifié avec succès. Redirection vers la connexion...';

    // 3. Déconnexion et redirection après 1,5 s
    setTimeout(() => {
      authStore.logout();
      router.replace('/login');
    }, 1500);

  } catch (error: unknown) {
    if (error instanceof Error) {
      // Message d'erreur métier renvoyé par l'API (ex. "Mot de passe actuel incorrect")
      erreur.value = error.message;
    } else {
      erreur.value = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.form-card {
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-top: 8px;
}

.field {
  --background: var(--ion-color-light);
  --border-radius: 10px;
  margin-bottom: 10px;
}

.msg {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 12px;
  border-radius: 10px;
  margin: 4px 0 12px;
}

.msg-error   { background: rgba(235, 68, 90, 0.10); color: var(--ion-color-danger); }
.msg-success { background: rgba(45, 175, 109, 0.12); color: #2daf6d; }
.msg-warning { background: rgba(255, 152, 0, 0.12);  color: #e67e22; }

.btn-submit {
  --background: #1e88e5;
  --border-radius: 10px;
  margin-top: 8px;
}
</style>
