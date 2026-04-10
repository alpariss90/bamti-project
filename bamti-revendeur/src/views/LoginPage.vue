<template>
  <ion-page class="login-page">
    <!-- Dégradé de fond BAM.TI -->
    <div class="login-bg">

      <!-- Logo + titre -->
      <div class="login-header">
        <div class="logo-wrapper">
          <!-- Logo SVG inline (remplacez par <img> si vous avez le fichier logo) -->
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-img">
            <circle cx="40" cy="40" r="38" fill="url(#grad)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#31ace3"/>
                <stop offset="100%" stop-color="#1B2A6B"/>
              </linearGradient>
            </defs>
            <!-- Flamme -->
            <path d="M40 14 C40 14 34 22 36 30 C32 26 33 20 33 20 C27 28 30 38 40 42 C50 38 53 28 47 20 C47 20 48 26 44 30 C46 22 40 14 40 14Z" fill="white" opacity="0.9"/>
            <!-- Famille (silhouettes simplifiées) -->
            <circle cx="28" cy="52" r="4" fill="white" opacity="0.85"/>
            <rect x="25" y="56" width="6" height="10" rx="2" fill="white" opacity="0.85"/>
            <circle cx="40" cy="54" r="3" fill="white" opacity="0.85"/>
            <rect x="37" y="57" width="6" height="8" rx="2" fill="white" opacity="0.85"/>
            <circle cx="52" cy="52" r="4" fill="white" opacity="0.85"/>
            <rect x="49" y="56" width="6" height="10" rx="2" fill="white" opacity="0.85"/>
          </svg>
        </div>
        <h1 class="brand-name">BAM<span class="brand-dot">.</span>TI</h1>
        <p class="brand-tagline">Eau minérale à la portée de toutes les bourses</p>
      </div>

      <!-- Carte de connexion -->
      <ion-card class="login-card">
        <ion-card-content>
          <h2 class="login-title">Connexion</h2>
          <p class="login-subtitle">Espace Revendeur</p>

          <!-- Message d'erreur -->
          <div v-if="errorMsg" class="error-banner">
            <ion-icon :icon="alertCircleOutline" />
            <span>{{ errorMsg }}</span>
          </div>

          <!-- Formulaire -->
          <form @submit.prevent="handleLogin" novalidate>
            <!-- Login -->
            <div class="input-group">
              <label class="input-label">Identifiant</label>
              <ion-item
                lines="none"
                class="input-item"
                :class="{ 'input-item--error': v$.login.$error }"
              >
                <ion-icon :icon="personOutline" slot="start" class="input-icon" />
                <ion-input
                  v-model="form.login"
                  type="text"
                  placeholder="Votre identifiant"
                  autocomplete="username"
                  :disabled="loading"
                  @ionBlur="v$.login.$touch()"
                />
              </ion-item>
              <p v-if="v$.login.$error" class="field-error">
                {{ v$.login.$errors[0].$message }}
              </p>
            </div>

            <!-- Mot de passe -->
            <div class="input-group">
              <label class="input-label">Mot de passe</label>
              <ion-item
                lines="none"
                class="input-item"
                :class="{ 'input-item--error': v$.password.$error }"
              >
                <ion-icon :icon="lockClosedOutline" slot="start" class="input-icon" />
                <ion-input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Votre mot de passe"
                  autocomplete="current-password"
                  :disabled="loading"
                  @ionBlur="v$.password.$touch()"
                />
                <ion-button
                  slot="end"
                  fill="clear"
                  size="small"
                  class="toggle-pwd"
                  @click="showPassword = !showPassword"
                  :disabled="loading"
                >
                  <ion-icon
                    :icon="showPassword ? eyeOffOutline : eyeOutline"
                    class="eye-icon"
                  />
                </ion-button>
              </ion-item>
              <p v-if="v$.password.$error" class="field-error">
                {{ v$.password.$errors[0].$message }}
              </p>
            </div>

            <!-- Bouton de connexion -->
            <ion-button
              type="submit"
              expand="block"
              class="login-btn"
              :disabled="loading"
            >
              <ion-spinner v-if="loading" name="crescent" slot="start" />
              <span v-if="!loading">Se connecter</span>
              <span v-else>Connexion en cours…</span>
            </ion-button>
          </form>
        </ion-card-content>
      </ion-card>

      <!-- Footer -->
      <p class="login-footer">© {{ currentYear }} BAM.TI — Tous droits réservés</p>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonCard, IonCardContent, IonItem,
  IonInput, IonButton, IonIcon, IonSpinner,
} from '@ionic/vue';
import {
  personOutline, lockClosedOutline,
  eyeOutline, eyeOffOutline, alertCircleOutline,
} from 'ionicons/icons';
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useVuelidate } from '@vuelidate/core';
import { required, minLength, helpers } from '@vuelidate/validators';
import { useAuthStore } from '../stores/auth';

// ── État local ───────────────────────────────────────────────────────────────
const router    = useRouter();
const authStore = useAuthStore();

const form         = reactive({ login: '', password: '' });
const showPassword = ref(false);
const errorMsg     = ref('');
const loading      = computed(() => authStore.loading);
const currentYear  = new Date().getFullYear();

// ── Validation Vuelidate ─────────────────────────────────────────────────────
const rules = {
  login: {
    required: helpers.withMessage("L'identifiant est obligatoire.", required),
  },
  password: {
    required: helpers.withMessage('Le mot de passe est obligatoire.', required),
    minLength: helpers.withMessage('Au moins 4 caractères.', minLength(4)),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const v$ = useVuelidate(rules as any, form);

// ── Actions ───────────────────────────────────────────────────────────────────
async function handleLogin() {
  errorMsg.value = '';
  const isValid = await v$.value.$validate();
  if (!isValid) return;

  try {
    await authStore.login({ login: form.login, password: form.password });
    await router.replace({ name: 'Home' });
  } catch (err: any) {
    errorMsg.value = err.message || 'Erreur de connexion.';
  }
}

// onLogoError conservé pour compatibilité si on passe à une vraie <img>
function onLogoError(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none';
}
</script>

<style scoped>
/* ── Fond dégradé BAM.TI ─────────────────────────────────────────────── */
.login-page {
  --background: transparent;
}

.login-bg {
  min-height: 100vh;
  background: var(--bamti-gradient);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

/* ── Header / Logo ───────────────────────────────────────────────────── */
.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-wrapper {
  width: 96px;
  height: 96px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
}

.logo-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 50%;
}

.brand-name {
  font-size: 2.4rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 3px;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.brand-dot {
  color: #f0c040;
}

.brand-tagline {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 6px 0 0;
  font-style: italic;
  letter-spacing: 0.4px;
}

/* ── Carte de connexion ──────────────────────────────────────────────── */
.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: var(--bamti-border-radius);
  box-shadow: var(--bamti-card-shadow), 0 8px 32px rgba(0, 0, 0, 0.18);
  --background: #ffffff;
  margin: 0;
}

.login-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ion-color-secondary);
  margin: 0 0 2px;
  text-align: center;
}

.login-subtitle {
  font-size: 0.82rem;
  color: var(--ion-color-medium);
  text-align: center;
  margin: 0 0 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ── Message d'erreur ────────────────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fdecea;
  border: 1px solid #f5c6cb;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  color: var(--ion-color-danger);
  font-size: 0.88rem;
}

.error-banner ion-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* ── Groupes de champs ───────────────────────────────────────────────── */
.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ion-color-secondary);
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.input-item {
  --background: #f0f7ff;
  --border-radius: 12px;
  --padding-start: 12px;
  --inner-padding-end: 8px;
  border-radius: 12px;
  border: 1.5px solid #d0e8f8;
  transition: border-color 0.2s;
}

.input-item:focus-within {
  border-color: var(--ion-color-primary);
}

.input-item--error {
  border-color: var(--ion-color-danger) !important;
  --background: #fff5f5;
}

.input-icon {
  color: var(--ion-color-primary);
  font-size: 1.2rem;
  margin-right: 4px;
}

.toggle-pwd {
  --color: var(--ion-color-medium);
}

.eye-icon {
  font-size: 1.1rem;
}

.field-error {
  color: var(--ion-color-danger);
  font-size: 0.78rem;
  margin: 4px 4px 0;
}

/* ── Bouton de connexion ─────────────────────────────────────────────── */
.login-btn {
  margin-top: 24px;
  --background: var(--bamti-gradient);
  --background-activated: #1B2A6B;
  --border-radius: 12px;
  --box-shadow: 0 4px 14px rgba(26, 159, 224, 0.4);
  height: 52px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.login-footer {
  margin-top: 20px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}
</style>
