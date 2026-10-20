const { Op } = require('sequelize');
const MENU = require('../config/menu');
const { aLaPermission } = require('../middleware/autorise');
const { aujourdhui } = require('../services/rapport/periode');

// Un lien est visible si le profil a la permission et fait partie des profils autorisés (s'il y en a)
function visible(profil, item) {
  if (item.profils && !item.profils.includes(profil)) return false;
  return !item.perm || aLaPermission(profil, item.perm);
}

// Lien actif : adresse identique, sinon le plus long préfixe (ex. /dashboard pour /dashboard/index/10/2026)
function estSurChemin(chemin, prefixe) {
  return chemin === prefixe || chemin.startsWith(prefixe.endsWith('/') ? prefixe : prefixe + '/');
}

// Construit le menu de l'utilisateur : filtré selon son profil, avec les adresses, le lien actif et les compteurs.
function construireMenu({ profil, chemin, compteurs = {}, ctx }) {
  const resolu = [];
  let section = null;

  const pousser = item => {
    if (section) { resolu.push(section); section = null; }
    resolu.push(item);
  };

  for (const item of MENU) {
    if (item.section) { section = { section: item.section }; continue; }

    if (item.groupe) {
      if (item.profils && !item.profils.includes(profil)) continue;
      const liens = item.liens
        .filter(l => visible(profil, l))
        .map(l => ({ lien: l.lien, href: typeof l.href === 'function' ? l.href(ctx) : l.href, actifSi: l.actifSi, compteur: compteurs[l.compteur] || 0 }));
      if (liens.length) pousser({ groupe: item.groupe, icone: item.icone, liens });
    } else if (visible(profil, item)) {
      pousser({ lien: item.lien, icone: item.icone, href: typeof item.href === 'function' ? item.href(ctx) : item.href, actifSi: item.actifSi, compteur: compteurs[item.compteur] || 0 });
    }
  }

  // Lien actif : le plus long préfixe correspondant à l'adresse demandée
  let meilleur = null, longueur = -1;
  const candidats = [];
  resolu.forEach(i => {
    if (i.groupe) i.liens.forEach(l => candidats.push(l));
    else if (!i.section) candidats.push(i);
  });
  for (const l of candidats) {
    for (const p of [l.href, l.actifSi].filter(Boolean)) {
      const prefixe = p.replace(/\/+$/, '') || '/';
      if (estSurChemin(chemin, prefixe) && prefixe.length > longueur) { meilleur = l; longueur = prefixe.length; }
    }
  }
  if (meilleur) meilleur.actif = true;

  resolu.forEach((i, n) => {
    if (!i.groupe) return;
    i.id = `menu-groupe-${n}`;
    i.ouvert = i.liens.some(l => l.actif);
    i.compteur = i.liens.reduce((s, l) => s + l.compteur, 0);
  });

  return resolu;
}

// Compteurs affichés en pastille : seulement ceux que le profil peut voir.
// En cas d'erreur, les compteurs restent à 0 et la page s'affiche normalement.
async function calculerCompteurs(profil) {
  const db = require('../models');
  const compteurs = {};
  const nonValide = { [Op.or]: [{ isValid: false }, { isValid: null }] };
  const taches = [];

  if (aLaPermission(profil, 'commandes')) {
    const debut = new Date(); debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut); fin.setDate(fin.getDate() + 1);
    taches.push(db.Commande.count({ where: { statut: 'en attente', date_commande: { [Op.gte]: debut, [Op.lt]: fin } } })
      .then(n => { compteurs.commandesJour = n; }));
  }
  if (aLaPermission(profil, 'reservations')) {
    taches.push(db.Reservation.count({ where: { date_livraison: aujourdhui(), is_livre: false } })
      .then(n => { compteurs.reservationsJour = n; }));
  }
  if (aLaPermission(profil, 'mvt_matieres')) {
    taches.push(db.MvtMatiere.count({ where: nonValide }).then(n => { compteurs.matieresNonValidees = n; }));
  }
  if (aLaPermission(profil, 'depenses')) {
    taches.push(db.Depense.count({ where: nonValide }).then(n => { compteurs.depensesNonValidees = n; }));
  }

  const resultats = await Promise.allSettled(taches);
  resultats.filter(r => r.status === 'rejected')
    .forEach(r => console.error('Erreur lors du calcul d’un compteur du menu :', r.reason));
  return compteurs;
}

module.exports = { construireMenu, calculerCompteurs };
