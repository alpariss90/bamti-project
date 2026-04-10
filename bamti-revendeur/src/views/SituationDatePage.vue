<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="bamti-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button color="light" />
        </ion-buttons>
        <ion-title class="bamti-title">Situation par date</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <!-- Filtre dates -->
      <div class="filter-card">
        <div class="filter-row">
          <div class="date-field">
            <label class="field-label">Date début</label>
            <input type="date" v-model="dateDebut" class="date-input" :max="dateFin" @change="chercher" />
          </div>
          <div class="date-field">
            <label class="field-label">Date fin</label>
            <input type="date" v-model="dateFin" class="date-input" :min="dateDebut" @change="chercher" />
          </div>
        </div>
        <ion-button expand="block" class="search-btn" @click="chercher" :disabled="loading">
          <ion-icon :icon="searchOutline" slot="start" />
          {{ loading ? 'Chargement...' : 'Afficher' }}
        </ion-button>
      </div>

      <!-- Résultats -->
      <div v-if="affiche">
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
            <div class="totaux-lbl">Gain revendeur<br>({{ totaux.totalQte }} sac.)</div>
          </div>
        </div>

        <!-- Tableau -->
        <div v-if="ventes.length === 0" class="empty-state">
          <ion-icon :icon="documentTextOutline" class="empty-icon" />
          <p>Aucune vente sur cette période</p>
        </div>

        <div v-else>
          <div class="section-title">Détail des ventes ({{ ventes.length }})</div>
          <ion-list class="vente-list">
            <ion-item v-for="v in ventes" :key="v.id_local" class="vente-item">
              <ion-label>
                <div class="vente-header">
                  <span class="vente-client">{{ nomClient(v.id_client) }}</span>
                  <span class="vente-date">{{ fmtDate(v.date_vente) }}</span>
                </div>
                <div class="vente-details">
                  <span>{{ v.quantite }} sac. × {{ fmtF(v.prix_unitaire) }} = {{ fmtF(v.montant_total) }}</span>
                </div>
                <div class="vente-paiement">
                  <span class="pay-ok">↑ {{ fmtF(v.montant_paye) }}</span>
                  <span v-if="v.montant_total - v.montant_paye > 0" class="pay-reste">
                    reste {{ fmtF(v.montant_total - v.montant_paye) }}
                  </span>
                  <ion-badge :color="v.type_paiement === 'total' ? 'success' : 'warning'" class="pay-badge">
                    {{ v.type_paiement === 'total' ? 'Soldé' : 'Éch.' }}
                  </ion-badge>
                </div>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonList, IonItem, IonLabel, IonIcon, IonBadge, IonButton,
} from '@ionic/vue';
import { searchOutline, documentTextOutline } from 'ionicons/icons';
import { ref, reactive, onMounted } from 'vue';
import { db, type LocalVente, ventesPeriode, calculTotaux } from '../services/db';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading   = ref(false);
const affiche   = ref(false);
const ventes    = ref<LocalVente[]>([]);
const clients   = ref<Record<number, string>>({});

interface Totaux { totalVente: number; totalEncaisse: number; totalReste: number; totalQte: number; gainRevendeur: number; }
const totaux = reactive<Totaux>({ totalVente: 0, totalEncaisse: 0, totalReste: 0, totalQte: 0, gainRevendeur: 0 });

const today = new Date().toISOString().split('T')[0];
const dateDebut = ref(today);
const dateFin   = ref(today);

onMounted(async () => {
  const allClients = await db.clients.toArray();
  clients.value = Object.fromEntries(
    allClients.map(c => [c.id_local!, `${c.nom} ${c.prenom}`])
  );
  await chercher();
});

async function chercher() {
  loading.value = true;
  try {
    ventes.value = await ventesPeriode(dateDebut.value, dateFin.value);
    const t = await calculTotaux(ventes.value, authStore.gainParSachet);
    Object.assign(totaux, t);
    affiche.value = true;
  } finally {
    loading.value = false;
  }
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
</script>

<style scoped>
.bamti-toolbar { --background: #1B2A6B; --color: #fff; }
.bamti-title   { font-weight: 700; color: #fff; }
.page-content  { --background: #f0f7ff; }

.filter-card {
  background: #fff;
  margin: 14px;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(26,159,224,0.08);
}

.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.date-field { flex: 1; }

.field-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1B2A6B;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.date-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #d0e6f5;
  border-radius: 10px;
  background: #f0f7ff;
  font-size: 0.88rem;
  color: #1B2A6B;
}

.search-btn {
  --border-radius: 10px;
  height: 42px;
  font-weight: 600;
  --background: #1A9FE0;
}

.totaux-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 14px 4px;
}

.totaux-card { border-radius: 14px; padding: 14px 12px; text-align: center; color: #fff; }
.totaux-card.blue   { background: linear-gradient(135deg, #1A9FE0, #1B2A6B); }
.totaux-card.green  { background: linear-gradient(135deg, #27AE60, #1e7e44); }
.totaux-card.red    { background: linear-gradient(135deg, #E74C3C, #922b21); }
.totaux-card.orange { background: linear-gradient(135deg, #F39C12, #c27d10); }
.totaux-val { font-size: 1rem; font-weight: 700; }
.totaux-lbl { font-size: 0.7rem; opacity: 0.85; margin-top: 4px; }

.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ion-color-medium);
  padding: 14px 20px 6px;
}

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

.vente-paiement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.78rem;
}

.pay-ok    { color: var(--ion-color-success); font-weight: 600; }
.pay-reste { color: var(--ion-color-danger); font-weight: 600; }
.pay-badge { font-size: 0.65rem; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 24px;
  gap: 12px;
  color: var(--ion-color-medium);
}
.empty-icon { font-size: 52px; opacity: 0.4; }
</style>
