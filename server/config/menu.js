// Menu latéral : décrit une seule fois, affiché par views/partials/menu.ejs pour tous les profils.
//
// Chaque élément est soit :
//   { section: 'Titre' }                                   titre de section
//   { lien, icone, href, perm, profils?, compteur? }      lien direct
//   { groupe, icone, profils?, liens: [ { lien, href, perm, profils?, compteur? } ] }
//
// - perm     : droit nécessaire (config/permissions.js). Le lien n'apparaît que si l'utilisateur l'a.
// - profils  : restreint en plus l'affichage à certains profils (ex. la page des ventes du caissier).
// - compteur : nom du compteur affiché en pastille (calculé dans utils/menu.js).
// - href     : chaîne, ou fonction (ctx) => chaîne pour une adresse calculée.
// Un groupe sans lien autorisé disparaît, une section vide aussi.

const ADMIN = ['admin', 'gestionnaire'];

module.exports = [
  { lien: 'Tableau de bord', icone: 'ri-dashboard-2-line', perm: 'dashboard', profils: [ 'visualisation'],
    href: ctx => `/dashboard/index/${ctx.mois}/${ctx.annee}`, actifSi: '/dashboard' },

  { section: 'Ventes' },
  { lien: 'Ventes', icone: 'ri-shopping-cart-2-line', href: '/ventes/index/caissier', perm: 'ventes', profils: ['caissier'] },
  { groupe: 'Ventes', icone: 'ri-shopping-cart-2-line', profils: ADMIN, liens: [
    { lien: 'Nouvelle vente / liste', href: '/ventes/index', perm: 'ventes' },
    { lien: 'Filtrage', href: '/ventes/filtre', perm: 'ventes' },
    { lien: 'Ventes annulées', href: '/ventes/annulees', perm: 'ventes' },
  ] },
  { groupe: 'Redevables', icone: 'ri-wallet-3-line', profils: ADMIN, liens: [
    { lien: 'Liste des redevables', href: '/ventes/redevable', perm: 'ventes' },
    { lien: 'Imprimer les redevables', href: '/ventes/redevable/print', perm: 'ventes' },
  ] },
  { groupe: 'Commandes', icone: 'ri-inbox-archive-line', liens: [
    { lien: 'Gestion des commandes', href: '/commandes/index', perm: 'commandes' },
    { lien: 'Commandes du jour', href: '/commandes/jour', perm: 'commandes', compteur: 'commandesJour' },
  ] },
  { groupe: 'Réservations', icone: 'ri-calendar-check-line', liens: [
    { lien: 'Faire une réservation', href: '/reservations/index', perm: 'reservations' },
    { lien: 'Réservations du jour', href: '/reservations/jour', perm: 'reservations', compteur: 'reservationsJour' },
    { lien: 'Non livrées', href: '/reservations/non-livrees', perm: 'reservations' },
    { lien: 'Livrées', href: '/reservations/livrees', perm: 'reservations' },
  ] },
  { lien: 'Tickets', icone: 'ri-coupon-3-line', href: '/tickets/index', perm: 'tickets' },
  { groupe: 'Caisse', icone: 'ri-safe-2-line', liens: [
    { lien: 'Ma caisse', href: '/caisse/index', perm: 'caisse', compteur: 'journeesACloturer' },
    { lien: 'À recevoir', href: '/caisse/recevoir', perm: 'caisse.recevoir', compteur: 'remisesARecevoir' },
    { lien: 'Suivi', href: '/caisse/suivi', perm: 'caisse' },
  ] },
  { lien: 'Facture proforma', icone: 'ri-file-text-line', href: '/facture/proforma', perm: 'facture', profils: ADMIN },

  { section: 'Revendeurs' },
  { groupe: 'Revendeurs', icone: 'ri-user-star-line', liens: [
    { lien: 'Liste des revendeurs', href: '/revendeurs/index', perm: 'revendeurs' },
    { lien: 'Recette du jour', href: '/revendeurs/recette/jour', perm: 'revendeurs' },
    { lien: 'Recette par période', href: '/revendeurs/recette/periode', perm: 'revendeurs' },
    { lien: 'Synchroniser les données', href: '/revendeurs/sync', perm: 'revendeurs' },
  ] },

  { section: 'Stocks' },
  { groupe: 'Sachets', icone: 'ri-drop-line', liens: [
    { lien: 'Production', href: '/stock-sachet/index', perm: 'stock_sachet' },
    { lien: 'Statistiques', href: '/stock-sachet/statistiques', perm: 'stock_sachet' },
  ] },
  { groupe: 'Matières', icone: 'ri-flask-line', liens: [
    { lien: 'Gestion', href: '/mvt_matieres/index', perm: 'mvt_matieres' },
    { lien: 'Filtrage', href: '/mvt_matieres/filtre', perm: 'mvt_matieres' },
    { lien: 'Non validées', href: '/mvt_matieres/non-valide', perm: 'mvt_matieres', compteur: 'matieresNonValidees' },
  ] },
  { groupe: 'Matériel', icone: 'ri-tools-line', liens: [
    { lien: 'Gestion', href: '/materiel/index', perm: 'materiel' },
    { lien: 'Entrée', href: '/materiel/entree', perm: 'materiel' },
    { lien: 'Sortie', href: '/materiel/sortie', perm: 'materiel' },
    { lien: 'Rebut', href: '/materiel/rebut', perm: 'materiel' },
    { lien: 'Statistiques', href: '/materiel/statistiques', perm: 'materiel' },
  ] },

  { section: 'Dépenses' },
  { groupe: 'Dépenses', icone: 'ri-money-dollar-circle-line', liens: [
    { lien: 'Gestion', href: '/depenses/index', perm: 'depenses' },
    { lien: 'Filtrage', href: '/depenses/filtre', perm: 'depenses' },
    { lien: 'Non validées', href: '/depenses/non-valide', perm: 'depenses', compteur: 'depensesNonValidees' },
  ] },

  { section: 'Personnel' },
  { lien: 'Personnel', icone: 'ri-team-line', href: '/person/index', perm: 'personnel' },
  { groupe: 'Congés', icone: 'ri-sun-line', liens: [
    { lien: 'Gestion des congés', href: '/conge/index', perm: 'conge' },
    { lien: 'Planifier un congé', href: '/planification/index', perm: 'planification' },
    { lien: 'Planifications', href: '/planification/liste', perm: 'planification' },
  ] },
  { groupe: 'Paie', icone: 'ri-bank-card-line', liens: [
    { lien: 'Salaires de base', href: '/montant_personnel/index', perm: 'montant_personnel' },
    { lien: 'Avances & retenues', href: '/personnel_avance/index', perm: 'personnel_avance' },
    { lien: 'Salaires', href: '/salaire/index', perm: 'salaire' },
  ] },

  { section: 'Administration' },
  { groupe: 'Paramètres', icone: 'ri-settings-3-line', liens: [
    { lien: 'Clients', href: '/personnes/index', perm: 'personnes' },
    { lien: 'Engins', href: '/engin/index', perm: 'engin' },
    { lien: 'Types de dépense', href: '/type_depense/index', perm: 'type_depense' },
  ] },
  { groupe: 'Utilisateurs', icone: 'ri-shield-user-line', liens: [
    { lien: 'Utilisateurs', href: '/users/index', perm: 'users' },
    { lien: 'Profils', href: '/profil/index', perm: 'profil' },
    { lien: 'Logs de connexion', href: '/logs/index', perm: 'logs' },
  ] },
  { groupe: 'Système', icone: 'ri-database-2-line', liens: [
    { lien: 'Sauvegardes', href: '/backup/liste', perm: 'backup' },
    { lien: "Rapports d'activité", href: '/rapports/index', perm: 'rapports' },
  ] },
];
