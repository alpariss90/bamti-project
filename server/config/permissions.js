// Table des droits : pour chaque permission, les profils qui l'ont.
// Les routes l'utilisent via autorise('permission') (middleware/autorise.js)
// et les vues via peut('permission') pour afficher ou cacher menus et boutons.
//
// Pour donner ou retirer un droit, modifier la liste de profils ici : rien d'autre à changer.

module.exports = {
  // ── Accès aux modules (routes montées dans app.js) ───────────────────────────
  // 'accueil' est vérifié sur toutes les pages web (app.use('/') s'applique à toutes les URL)
  accueil:            ['admin', 'gestionnaire', 'caissier', 'visualisation', 'magasinier'],
  dashboard:          ['admin', 'gestionnaire', 'caissier', 'visualisation'],
  users:              ['admin'],
  personnes:          ['admin', 'gestionnaire'],
  personnel:          ['admin', 'gestionnaire'],
  commandes:          ['admin', 'gestionnaire', 'caissier'],
  type_depense:       ['admin', 'gestionnaire'],
  depenses:           ['admin', 'gestionnaire'],
  engin:              ['admin', 'gestionnaire'],
  profil:             ['admin'],
  conge:              ['admin', 'gestionnaire'],
  planification:      ['admin', 'gestionnaire'],
  ventes:             ['admin', 'gestionnaire', 'caissier'],
  montant_personnel:  ['admin'],
  personnel_avance:   ['admin'],
  salaire:            ['admin'],
  mvt_matieres:       ['admin', 'gestionnaire', 'magasinier'],
  materiel:           ['admin', 'gestionnaire', 'magasinier'],
  facture:            ['admin', 'gestionnaire', 'caissier'],
  stock_sachet:       ['admin', 'gestionnaire'],
  tickets:            ['admin', 'gestionnaire', 'caissier'],
  revendeurs:         ['admin', 'gestionnaire'],
  mdp:                ['admin', 'gestionnaire', 'caissier', 'visualisation'],
  backup:             ['admin', 'gestionnaire'],
  reservations:       ['admin', 'gestionnaire', 'caissier'],
  rapports:           ['admin'],
  logs:               ['admin', 'gestionnaire'],

  // ── Actions précises ────────────────────────────────────────────────────────
  // Valider une dépense
  'depenses.valider':         ['admin'],
  // Modifier / supprimer une dépense non validée saisie par un autre utilisateur
  // (sans ce droit, on ne peut toucher qu'à ses propres dépenses non validées)
  'depenses.modifier_toutes': ['admin'],
  // Formulaire + suppression des commandes
  'commandes.gerer':          ['admin', 'gestionnaire'],
  // Formulaire, suppression et « Effectuer vente » des tickets
  'tickets.gerer':            ['admin', 'gestionnaire'],
  // Alerte de stock critique (matériel + matière) affichée à la connexion
  'alerte_stock':             ['admin', 'gestionnaire']
};
