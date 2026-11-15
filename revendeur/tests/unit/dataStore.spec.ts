// Logique du téléphone (stores/dataStore.ts) : saisie hors ligne, file d'attente, envoi par uuid,
// rechargement sans doublon, migration des données de l'ancienne version.
// Le stockage du téléphone (Dexie) et le serveur sont remplacés par des faux en mémoire.
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { BootstrapData, SyncPayload } from '@/types/data';

const faux = vi.hoisted(() => {
  const vide = () => ({
    clients: [] as any[], ventes: [] as any[], paiements: [] as any[],
    pending_clients: [] as any[], pending_ventes: [] as any[], pending_paiements: [] as any[],
  });
  return {
    stockage: vide(),
    vide,
    serveur: { clients: [], ventes: [], paiements: [] } as any,
    envois: [] as any[],
    reponseSync: null as null | ((payload: any) => any),
  };
});

const copie = <T>(v: T): T => JSON.parse(JSON.stringify(v));

vi.mock('@/services/localDataStorage', () => {
  const s = () => faux.stockage;
  return {
    localDataStorage: {
      saveClients: async (v: any[]) => { s().clients = copie(v); },
      saveVentes: async (v: any[]) => { s().ventes = copie(v); },
      savePaiements: async (v: any[]) => { s().paiements = copie(v); },
      getClients: async () => copie(s().clients),
      getVentes: async () => copie(s().ventes),
      getPaiements: async () => copie(s().paiements),
      savePendingClients: async (v: any[]) => { s().pending_clients = copie(v); },
      savePendingVentes: async (v: any[]) => { s().pending_ventes = copie(v); },
      savePendingPaiements: async (v: any[]) => { s().pending_paiements = copie(v); },
      getPendingClients: async () => copie(s().pending_clients),
      getPendingVentes: async () => copie(s().pending_ventes),
      getPendingPaiements: async () => copie(s().pending_paiements),
      clearPendingData: async () => { s().pending_clients = []; s().pending_ventes = []; s().pending_paiements = []; },
      clearAllBusinessData: async () => { s().clients = []; s().ventes = []; s().paiements = []; },
    },
  };
});

// Faux serveur : /sync accepte tout (sauf réponse personnalisée), /restore renvoie faux.serveur
vi.mock('@/services/mobileDataService', () => ({
  mobileDataService: {
    sync: async (_token: string, payload: SyncPayload) => {
      faux.envois.push(copie(payload));
      if (faux.reponseSync) return faux.reponseSync(payload);
      return {
        success: true,
        message: 'ok',
        resultats: {
          clients: payload.clients.length, ventes: payload.ventes.length, paiements: payload.paiements.length,
          deja_recus: 0,
          acceptes: {
            clients: payload.clients.map((c) => c.uuid),
            ventes: payload.ventes.map((v) => v.uuid),
            paiements: payload.paiements.map((p) => p.uuid),
          },
          erreurs: [],
        },
      };
    },
    restore: async () => ({ success: true, data: copie(faux.serveur) as BootstrapData }),
    bootstrap: async () => ({ success: true, data: copie(faux.serveur) as BootstrapData }),
    deleteClient: async () => ({ success: true, message: 'ok' }),
  },
}));

import { dataStore } from '@/stores/dataStore';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const USER = 7;
const AUJOURDHUI = '2026-11-15';

// Ce que le vrai serveur renverrait après avoir reçu un envoi (ids serveur, état « envoyee »)
function serveurApresEnvoi(payload: SyncPayload, idClientServeur = 10001) {
  faux.serveur.clients.push(...payload.clients.map((c) => ({ ...c, id: idClientServeur })));
  payload.ventes.forEach((v, i) => faux.serveur.ventes.push({
    id: 500 + faux.serveur.ventes.length + i, uuid: v.uuid, type_vente: v.type_vente, quantite: v.quantite,
    observation: v.observation, type_paiement: v.type_paiement, montant: v.quantite * v.prix_unitaire,
    prix_unitaire: v.prix_unitaire, date_vente: v.date_vente, id_client: v.id_client ?? idClientServeur,
    user: USER, statut: 'envoyee', createdAt: '', updatedAt: '',
  }));
  payload.paiements.forEach((p, i) => {
    const vente = faux.serveur.ventes.find((v: any) => v.uuid === p.vente_uuid);
    faux.serveur.paiements.push({
      id: 900 + faux.serveur.paiements.length + i, uuid: p.uuid, montant: p.montant, date: p.date,
      id_vente: vente.id, vente_uuid: p.vente_uuid, observation: p.observation, statut: 'envoyee', createdAt: '', updatedAt: '',
    });
  });
}

async function nouveauClientEtVente(typePaiement: 'total' | 'echellonner' = 'total', verse = 0) {
  const client = await dataStore.addClientOffline({ nom: 'Issa', prenom: 'Ali' });
  await dataStore.addVenteOffline({
    userId: USER, client, type_vente: 'livrer', quantite: 50, prix_unitaire: 25,
    type_paiement: typePaiement, date_vente: AUJOURDHUI, montant_verse: verse,
  });
  return client;
}

beforeEach(async () => {
  faux.stockage = faux.vide();
  faux.serveur = { clients: [], ventes: [], paiements: [] };
  faux.envois = [];
  faux.reponseSync = null;
  await dataStore.hydrate();
});

describe('saisie hors ligne', () => {
  test('client, vente et paiement reçoivent un uuid et entrent dans la file d\'attente', async () => {
    const client = await nouveauClientEtVente();
    const vente = dataStore.state.ventes[0];
    const paiement = dataStore.state.paiements[0];
    expect(client.uuid).toMatch(UUID);
    expect(vente).toMatchObject({ client_uuid: client.uuid, statut: 'telephone', montant: 1250 });
    expect(vente.uuid).toMatch(UUID);
    expect(paiement).toMatchObject({ vente_uuid: vente.uuid, montant: 1250, statut: 'telephone' });
    expect(dataStore.getPendingCount()).toBe(3);
    expect(faux.stockage.pending_ventes[0].uuid).toBe(vente.uuid);
  });

  test('vente à crédit sans versement : aucun paiement à 0 F', async () => {
    await nouveauClientEtVente('echellonner', 0);
    expect(dataStore.state.paiements).toHaveLength(0);
    expect(dataStore.state.pendingPaiements).toHaveLength(0);
  });

  test('versement supérieur au total refusé', async () => {
    await expect(nouveauClientEtVente('echellonner', 2000)).rejects.toThrow(/depasser/);
  });

  test('versement supérieur au reste refusé', async () => {
    await nouveauClientEtVente('echellonner', 1000);
    const vente = dataStore.state.ventes[0];
    await expect(dataStore.addPaiementOffline({ venteId: vente.id, montant: 300, date: AUJOURDHUI })).rejects.toThrow(/Reste a payer: 250/);
  });

  test('vente d\'avant la mise à jour (sans uuid) : versement refusé avec un message clair', async () => {
    dataStore.state.ventes.push({
      id: 42, type_vente: 'usine', quantite: 10, observation: null, type_paiement: 'echellonner', montant: 250,
      prix_unitaire: 25, date_vente: AUJOURDHUI, id_client: 1, user: USER, createdAt: '', updatedAt: '',
    });
    await expect(dataStore.addPaiementOffline({ venteId: 42, montant: 100, date: AUJOURDHUI })).rejects.toThrow(/Mise a jour/);
  });
});

describe('envoi au serveur', () => {
  test('tout est désigné par uuid ; un client du guichet par son id', async () => {
    await nouveauClientEtVente();
    await dataStore.addVenteOffline({
      userId: USER, client: { id: 3, nom: 'Guichet', prenom: 'X', telephone: null, adresse: null },
      type_vente: 'usine', quantite: 10, prix_unitaire: 25, type_paiement: 'total', date_vente: AUJOURDHUI,
    });
    await dataStore.syncPendingData('jeton');
    const envoi = faux.envois[0];
    expect(envoi.clients).toHaveLength(1);
    const venteGuichet = envoi.ventes.find((v: any) => v.quantite === 10);
    const venteNouveau = envoi.ventes.find((v: any) => v.quantite === 50);
    expect(venteGuichet).toMatchObject({ id_client: 3 });
    expect(venteGuichet.client_uuid).toBeUndefined();
    expect(venteNouveau.client_uuid).toBe(envoi.clients[0].uuid);
    expect(venteNouveau.id_client).toBeUndefined();
    expect(envoi.paiements.every((p: any) => UUID.test(p.uuid) && UUID.test(p.vente_uuid))).toBe(true);
    expect(JSON.stringify(envoi)).not.toMatch(/id_local/);
  });

  test('après envoi : file vide et chaque vente affichée une seule fois (copie du serveur)', async () => {
    await nouveauClientEtVente();
    faux.reponseSync = (payload) => {
      serveurApresEnvoi(payload);
      return { success: true, message: 'ok', resultats: { clients: 1, ventes: 1, paiements: 1, deja_recus: 0,
        acceptes: { clients: payload.clients.map((c) => c.uuid), ventes: payload.ventes.map((v) => v.uuid), paiements: payload.paiements.map((p) => p.uuid) }, erreurs: [] } };
    };
    const res = await dataStore.syncPendingData('jeton');
    expect(res).toEqual({ synced: 3, errors: [] });
    expect(dataStore.getPendingCount()).toBe(0);
    expect(dataStore.state.ventes).toHaveLength(1);
    expect(dataStore.state.ventes[0]).toMatchObject({ id: 500, statut: 'envoyee' });
    expect(dataStore.state.paiements).toHaveLength(1);
    expect(dataStore.state.paiements[0].id_vente).toBe(500);
    expect(dataStore.state.clients.filter((c) => c.nom === 'Issa')).toHaveLength(1);
  });

  test('élément refusé : il reste dans la file avec le motif', async () => {
    await nouveauClientEtVente();
    faux.reponseSync = (payload) => ({ success: true, message: 'ok', resultats: { clients: 1, ventes: 0, paiements: 0, deja_recus: 0,
      acceptes: { clients: payload.clients.map((c) => c.uuid), ventes: [], paiements: [] },
      erreurs: ['Vente du 2026-11-15 (50 sachets) : client introuvable'] } });
    const res = await dataStore.syncPendingData('jeton');
    expect(res.errors).toEqual(['Vente du 2026-11-15 (50 sachets) : client introuvable']);
    expect(dataStore.state.pendingClients).toHaveLength(0);
    expect(dataStore.state.pendingVentes).toHaveLength(1);
    expect(dataStore.state.pendingPaiements).toHaveLength(1);
    expect(dataStore.state.ventes).toHaveLength(1); // toujours visible sur le téléphone
  });

  test('client hors ligne sans vente : envoi bloqué', async () => {
    await dataStore.addClientOffline({ nom: 'Seul', prenom: 'Client' });
    await expect(dataStore.syncPendingData('jeton')).rejects.toThrow(/au moins une vente/);
    expect(faux.envois).toHaveLength(0);
  });
});

describe('rechargement depuis le serveur', () => {
  test('ce qui n\'est pas encore envoyé reste sur le téléphone', async () => {
    await nouveauClientEtVente();
    faux.serveur.ventes.push({ id: 77, uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', type_vente: 'usine', quantite: 5, observation: null,
      type_paiement: 'total', montant: 125, prix_unitaire: 25, date_vente: AUJOURDHUI, id_client: 1, user: USER, statut: 'validee', createdAt: '', updatedAt: '' });
    await dataStore.restoreFromServer('jeton');
    expect(dataStore.state.ventes.map((v) => v.statut).sort()).toEqual(['telephone', 'validee']);
    expect(dataStore.getPendingCount()).toBe(3);
  });

  test('élément en attente que le serveur a déjà (réponse perdue) : retiré de la file, pas de doublon', async () => {
    await nouveauClientEtVente();
    serveurApresEnvoi(copie({
      clients: faux.stockage.pending_clients, ventes: faux.stockage.pending_ventes.map((v: any) => ({ ...v, id_client: undefined })),
      paiements: faux.stockage.pending_paiements,
    }) as SyncPayload);
    await dataStore.restoreFromServer('jeton');
    expect(dataStore.getPendingCount()).toBe(0);
    expect(dataStore.state.ventes).toHaveLength(1);
    expect(dataStore.state.ventes[0].statut).toBe('envoyee');
  });

  test('à la connexion (mémoire vide) : les ventes non envoyées ne sont pas perdues', async () => {
    await nouveauClientEtVente();
    dataStore.state.ventes = [];
    dataStore.state.pendingVentes = [];
    dataStore.state.pendingPaiements = [];
    dataStore.state.pendingClients = [];
    await dataStore.restoreFromServer('jeton');
    expect(dataStore.getPendingCount()).toBe(3);
    expect(dataStore.state.ventes).toHaveLength(1);
  });

  test('compte les nouveautés pour l\'écran « Mise à jour »', async () => {
    faux.serveur.clients.push({ id: 1, uuid: null, nom: 'A', prenom: 'B', telephone: null, adresse: null });
    expect(await dataStore.restoreFromServer('jeton')).toEqual({ clients: 1, ventes: 0, paiements: 0 });
    expect(await dataStore.restoreFromServer('jeton')).toEqual({ clients: 0, ventes: 0, paiements: 0 });
  });
});

describe('migration des données de l\'ancienne version', () => {
  test('les éléments en attente reçoivent un uuid ; versement à 0 F retiré', async () => {
    faux.stockage.clients = [{ id: -1, nom: 'Ancien', prenom: 'Client', telephone: null, adresse: null }];
    faux.stockage.ventes = [{ id: -2, type_vente: 'usine', quantite: 10, observation: null, type_paiement: 'echellonner', montant: 250,
      prix_unitaire: 25, date_vente: AUJOURDHUI, id_client: -1, user: USER, createdAt: '', updatedAt: '' }];
    faux.stockage.paiements = [{ id: -3, montant: 0, date: AUJOURDHUI, id_vente: -2, observation: null, createdAt: '', updatedAt: '' }];
    faux.stockage.pending_clients = [{ id_local: -1, nom: 'Ancien', prenom: 'Client', telephone: null, adresse: null }];
    faux.stockage.pending_ventes = [{ id_local: -2, id_client_local: -1, type_vente: 'usine', quantite: 10, prix_unitaire: 25,
      type_paiement: 'echellonner', date_vente: AUJOURDHUI, observation: null }];
    faux.stockage.pending_paiements = [{ id_local: -3, id_vente_local: -2, montant: 0, date: AUJOURDHUI, observation: null }];

    await dataStore.hydrate();

    const [pc] = faux.stockage.pending_clients;
    const [pv] = faux.stockage.pending_ventes;
    expect(pc.uuid).toMatch(UUID);
    expect(pv.uuid).toMatch(UUID);
    expect(pv.client_uuid).toBe(pc.uuid);
    expect(faux.stockage.ventes[0]).toMatchObject({ uuid: pv.uuid, client_uuid: pc.uuid, statut: 'telephone' });
    expect(faux.stockage.pending_paiements).toHaveLength(0);

    await dataStore.syncPendingData('jeton');
    expect(faux.envois[0].ventes[0]).toMatchObject({ uuid: pv.uuid, client_uuid: pc.uuid });
  });

  test('anciennes copies déjà envoyées (sans uuid) : remplacées par celles du serveur', async () => {
    faux.stockage.ventes = [{ id: -9, type_vente: 'usine', quantite: 10, observation: null, type_paiement: 'total', montant: 250,
      prix_unitaire: 25, date_vente: AUJOURDHUI, id_client: 1, user: USER, createdAt: '', updatedAt: '' }];
    faux.serveur.ventes.push({ id: 12, uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', type_vente: 'usine', quantite: 10, observation: null,
      type_paiement: 'total', montant: 250, prix_unitaire: 25, date_vente: AUJOURDHUI, id_client: 1, user: USER, statut: 'validee', createdAt: '', updatedAt: '' });
    await dataStore.hydrate();
    await dataStore.restoreFromServer('jeton');
    expect(dataStore.state.ventes.map((v) => v.id)).toEqual([12]);
  });
});
