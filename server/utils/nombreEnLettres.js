const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIX_A_SEIZE = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function motDizaineTeen(value) {
  // value va de 10 à 19
  if (value <= 16) return DIX_A_SEIZE[value - 10];
  return `dix-${UNITES[value - 10]}`;
}

// Convertit un entier de 0 à 999 en lettres.
// noPluralCent : vrai quand ce groupe de centaines précède "mille"/"million"/"milliard"
// (auquel cas "cent" ne prend jamais de "s", même multiplié).
function centaineEnLettres(n, noPluralCent = false) {
  if (n === 0) return '';

  const c = Math.floor(n / 100);
  const reste = n % 100;
  const parties = [];

  if (c > 0) {
    parties.push(c === 1 ? 'cent' : `${UNITES[c]} cent`);
    if (c > 1 && reste === 0 && !noPluralCent) {
      parties[parties.length - 1] += 's';
    }
  }

  if (reste > 0) {
    if (reste < 10) {
      parties.push(UNITES[reste]);
    } else if (reste < 20) {
      parties.push(motDizaineTeen(reste));
    } else {
      const d = Math.floor(reste / 10);
      const u = reste % 10;

      if (d === 7 || d === 9) {
        const base = DIZAINES[d];
        const teen = motDizaineTeen(10 + u);
        if (d === 7 && u === 1) {
          parties.push(`${base} et onze`);
        } else {
          parties.push(`${base}-${teen}`);
        }
      } else {
        let mot = DIZAINES[d];
        if (u === 1 && d !== 8) {
          mot += ' et un';
        } else if (u > 0) {
          mot += `-${UNITES[u]}`;
        } else if (d === 8) {
          mot += 's';
        }
        parties.push(mot);
      }
    }
  }

  return parties.join(' ');
}

// Convertit un entier positif en toutes lettres (français)
function nombreEnLettres(nombre) {
  let n = Math.round(Math.abs(Number(nombre) || 0));

  if (n === 0) return 'zéro';

  const tranches = [
    { valeur: 1000000000, mot: 'milliard', pluriel: 'milliards' },
    { valeur: 1000000, mot: 'million', pluriel: 'millions' },
    { valeur: 1000, mot: 'mille', pluriel: 'mille' },
  ];

  const parties = [];

  for (const tranche of tranches) {
    const qte = Math.floor(n / tranche.valeur);
    if (qte > 0) {
      if (tranche.valeur === 1000 && qte === 1) {
        parties.push('mille');
      } else {
        const mot = qte > 1 ? tranche.pluriel : tranche.mot;
        parties.push(`${centaineEnLettres(qte, true)} ${mot}`);
      }
      n %= tranche.valeur;
    }
  }

  if (n > 0) {
    parties.push(centaineEnLettres(n));
  }

  return parties.join(' ').replace(/\s+/g, ' ').trim();
}

// Montant en lettres avec majuscule initiale, prêt pour affichage sur une facture
function montantEnLettres(montant) {
  const texte = nombreEnLettres(montant);
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

module.exports = { nombreEnLettres, montantEnLettres };
