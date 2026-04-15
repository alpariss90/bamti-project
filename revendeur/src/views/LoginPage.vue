<template>
  <ion-page>
    <ion-content class="login-content" :fullscreen="true">
      <div class="login-wrapper">
        <div class="header">
          <h1>BAMTI Revendeur</h1>
          <p>Connexion securisee avec mode online/offline</p>
          <NetworkStatusBadge :is-online="isOnline" />
        </div>

        <ion-card class="login-card">
          <ion-card-content>
            <ion-item lines="none" class="field">
              <ion-input
                v-model="form.login"
                label="Login"
                label-placement="stacked"
                autocomplete="username"
                placeholder="Votre login"
              />
            </ion-item>

            <ion-item lines="none" class="field">
              <ion-input
                v-model="form.password"
                label="Mot de passe"
                label-placement="stacked"
                type="password"
                autocomplete="current-password"
                placeholder="Votre mot de passe"
              />
            </ion-item>

            <ion-note v-if="infoMessage" color="primary" class="status-message">{{ infoMessage }}</ion-note>
            <ion-note v-if="errorMessage" color="danger" class="status-message">{{ errorMessage }}</ion-note>

            <ion-button expand="block" class="submit" :disabled="loading" @click="submit">
              <ion-spinner v-if="loading" name="crescent" class="button-spinner" />
              <span>{{ loading ? 'Connexion...' : 'Se connecter' }}</span>
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonInput,
  IonItem,
  IonNote,
  IonPage,
  IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import NetworkStatusBadge from '@/components/NetworkStatusBadge.vue';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { ApiError } from '@/services/http';
import { authStore } from '@/stores/auth';
import { dataStore } from '@/stores/dataStore';

const router = useRouter();
const { isOnline } = useNetworkStatus();

const form = reactive({
  login: '',
  password: '',
});

const loading = ref(false);
const infoMessage = ref('');
const errorMessage = ref('');

onIonViewWillEnter(async () => {
  await authStore.restoreSession();
  if (authStore.state.isAuthenticated) {
    await router.replace('/home');
  }
});

async function submit(): Promise<void> {
  errorMessage.value = '';
  infoMessage.value = '';
  loading.value = true;

  try {
    const result = await authStore.login(form.login, form.password, isOnline.value);
    if (authStore.state.token && isOnline.value) {
      await dataStore.syncInitialData(authStore.state.token);
    } else {
      dataStore.hydrate();
    }
    infoMessage.value = result.message;
    await router.replace('/home');
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage.value = 'Mauvais identifiants.';
      } else if (error.status === 403) {
        errorMessage.value = error.message || 'Acces refuse.';
      } else if (error.status === 400) {
        errorMessage.value = 'Veuillez remplir correctement le login et le mot de passe.';
      } else {
        errorMessage.value = error.message;
      }
      return;
    }

    errorMessage.value = error instanceof Error ? error.message : 'Erreur inconnue.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-content {
  --background: linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%);
}

.login-wrapper {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 24px 16px;
}

.header h1 {
  margin: 0 0 8px;
  color: #0d47a1;
  font-size: 28px;
  font-weight: 700;
}

.header p {
  margin: 0 0 12px;
  color: #111111;
}

.login-card {
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
}

.field {
  --background: #f8fbff;
  --border-radius: 10px;
  margin-bottom: 12px;
}

.status-message {
  display: block;
  margin: 8px 2px;
}

.submit {
  margin-top: 14px;
  --background: #1e88e5;
  --background-activated: #1565c0;
  --border-radius: 10px;
}

.button-spinner {
  margin-right: 8px;
}

@media (min-width: 768px) {
  .login-wrapper {
    max-width: 460px;
    margin: 0 auto;
  }
}
</style>
