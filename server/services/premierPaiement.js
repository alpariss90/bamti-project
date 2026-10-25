// Premier paiement saisi à la création d'une vente (vente échelonnée, validation de commande, vente d'un ticket).
// Le montant reçu est obligatoire (0 si rien n'a été payé : on crée alors un paiement à 0 F, comme avant,
// pour que la vente reste comptée parmi les redevables — vue paiement_retard du tableau de bord).
const { aujourdhui } = require('./rapport/periode');

const fmt = n => new Intl.NumberFormat('fr-FR').format(n);
const arrondi = n => Math.round(Number(n) * 100) / 100;

// Montant reçu -> { montant, type_paiement } ou { erreur }
//   0 ou moins que le total : vente échelonnée ; égal au total : vente payée en totalité ; plus que le total : refusé
function montantRecu(montantTotal, saisi) {
  const s = String(saisi ?? '').replace(/[\s  ]/g, '').replace(',', '.');
  if (s === '') return { erreur: 'Saisissez le montant reçu (0 si rien n’a été payé).' };

  const montant = arrondi(s);
  const total = arrondi(montantTotal);
  if (!Number.isFinite(montant) || montant < 0) return { erreur: 'Le montant reçu est invalide.' };
  if (montant > total) {
    return { erreur: `Le montant reçu (${fmt(montant)} F) dépasse le montant total de la vente (${fmt(total)} F).` };
  }
  return { montant, type_paiement: montant === total ? 'total' : 'echellonner' };
}

// Date de paiement saisie ('AAAA-MM-JJ') -> { date } ou { erreur } ; obligatoire, au plus aujourd'hui
function datePaiement(saisie) {
  const date = String(saisie || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { erreur: 'Saisissez la date de paiement.' };
  if (date > aujourdhui()) return { erreur: 'La date de paiement ne peut pas être dans le futur.' };
  return { date };
}

module.exports = { montantRecu, datePaiement };
