// Génère le modèle Word public/modeldoc/rapport_activite.docx utilisé par les rapports d'activité.
// Usage : node scripts/genererModeleRapport.js
// Le fichier produit peut ensuite être retouché dans Word, tant que les balises {…} sont conservées.
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const SORTIE = path.join(__dirname, '..', 'public', 'modeldoc', 'rapport_activite.docx');
const LARGEUR = 10206; // largeur utile A4 en twips (marges de 850)
const GRIS = 'D9D9D9';
const BLEU = '1E3A5F';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function run(texte, { gras = false, taille = 20, couleur = null } = {}) {
  return `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${gras ? '<w:b/>' : ''}` +
    `${couleur ? `<w:color w:val="${couleur}"/>` : ''}<w:sz w:val="${taille}"/><w:szCs w:val="${taille}"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(texte)}</w:t></w:r>`;
}

function para(texte, { align = 'left', avant = 0, apres = 60, ...style } = {}) {
  return `<w:p><w:pPr><w:spacing w:before="${avant}" w:after="${apres}"/><w:jc w:val="${align}"/></w:pPr>${run(texte, style)}</w:p>`;
}

function titreSection(texte) {
  return `<w:p><w:pPr><w:spacing w:before="240" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="${BLEU}"/></w:pBdr></w:pPr>` +
    `${run(texte, { gras: true, taille: 24, couleur: BLEU })}</w:p>`;
}

function cellule(texte, largeur, { gras = false, fond = null, align = 'left' } = {}) {
  return `<w:tc><w:tcPr><w:tcW w:w="${largeur}" w:type="dxa"/>${fond ? `<w:shd w:val="clear" w:color="auto" w:fill="${fond}"/>` : ''}</w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:jc w:val="${align}"/></w:pPr>${run(texte, { gras, taille: 18 })}</w:p></w:tc>`;
}

// lignes : tableaux de textes ; options.entete = 1re ligne grisée ; options.derniereGras = ligne de total
function tableau(largeurs, lignes, { entete = true, derniereGras = false, aligns = [] } = {}) {
  const bordures = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>`).join('');
  const grille = largeurs.map(l => `<w:gridCol w:w="${l}"/>`).join('');
  const rows = lignes.map((ligne, i) => {
    const estEntete = entete && i === 0;
    const estTotal = derniereGras && i === lignes.length - 1;
    return `<w:tr>${estEntete ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}` +
      ligne.map((t, j) => cellule(t, largeurs[j], {
        gras: estEntete || estTotal,
        fond: estEntete || estTotal ? GRIS : null,
        align: estEntete ? 'center' : (aligns[j] || 'left')
      })).join('') + '</w:tr>';
  }).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${LARGEUR}" w:type="dxa"/><w:tblBorders>${bordures}</w:tblBorders>` +
    `<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grille}</w:tblGrid>${rows}</w:tbl>` +
    para('', { apres: 0, taille: 8 });
}

const D = 'right';
const corps = [
  para('Entreprise BAMTI', { align: 'center', gras: true, taille: 32, couleur: BLEU, apres: 0 }),
  para('NIF: 64750/P | SONUCI KOUBIA | Tél : 99582158 / 90231123', { align: 'center', taille: 18, apres: 160 }),
  para('{titre}', { align: 'center', gras: true, taille: 28, apres: 0 }),
  para('Période : {periode}', { align: 'center', taille: 22, apres: 0 }),
  para('Généré le {date_generation}', { align: 'center', taille: 16, couleur: '808080', apres: 120 }),

  titreSection('1. Synthèse'),
  tableau([6800, 3406], [
    ['Indicateur', 'Montant (F CFA)'],
    ['Chiffre d\'affaires (ventes)', '{s_ventes}'],
    ['Encaissements réels', '{s_encaissements}'],
    ['Dépenses validées', '{s_depenses}'],
    ['Résultat (ventes − dépenses)', '{s_resultat}'],
    ['Solde de caisse (encaissements − dépenses)', '{s_solde_caisse}']
  ], { derniereGras: true, aligns: ['left', D] }),

  titreSection('2. Ventes'),
  para('Nombre de ventes : {v_nb}  —  Quantité vendue : {v_qte} sachets  —  Montant : {v_montant} F'),
  para('Par type de vente', { gras: true, avant: 60 }),
  tableau([4206, 1800, 2000, 2200], [
    ['Type de vente', 'Nombre', 'Quantité', 'Montant (F)'],
    ['{#ventes_par_type}{libelle}', '{nb}', '{qte}', '{montant}{/ventes_par_type}']
  ], { aligns: ['left', D, D, D] }),
  para('Par type de paiement', { gras: true }),
  tableau([5206, 2000, 3000], [
    ['Type de paiement', 'Nombre', 'Montant (F)'],
    ['{#ventes_par_paiement}{libelle}', '{nb}', '{montant}{/ventes_par_paiement}']
  ], { aligns: ['left', D, D] }),

  titreSection('3. Encaissements réels'),
  tableau([6800, 3406], [
    ['Détail', 'Montant (F CFA)'],
    ['Encaissé sur les ventes de la période', '{e_periode}'],
    ['Recouvrements sur ventes antérieures', '{e_recouvrement}'],
    ['Total encaissé sur la période', '{e_total}']
  ], { derniereGras: true, aligns: ['left', D] }),
  tableau([6800, 3406], [
    ['Reste à encaisser sur les ventes de la période', '{e_reste_periode}'],
    ['Total des créances clients en fin de période', '{e_creances_totales}']
  ], { entete: false, aligns: ['left', D] }),

  titreSection('4. Dépenses'),
  para('Nombre de dépenses validées : {d_nb}  —  Total : {d_total} F'),
  para('{^depenses_par_type}Aucune dépense validée sur la période.{/depenses_par_type}', { couleur: '808080' }),
  tableau([5206, 2000, 3000], [
    ['Type de dépense', 'Nombre', 'Montant (F)'],
    ['{#depenses_par_type}{libelle}', '{nb}', '{montant}{/depenses_par_type}']
  ], { aligns: ['left', D, D] }),

  titreSection('5. Stock de sachets'),
  tableau([6800, 3406], [
    ['Mouvement', 'Sachets'],
    ['Stock en début de période', '{st_initial}'],
    ['Entrées (production et restitutions)', '{st_entrees}'],
    ['Sorties (ventes)', '{st_sorties}'],
    ['Stock en fin de période', '{st_final}']
  ], { derniereGras: true, aligns: ['left', D] }),

  para('{#afficher_detail}', { apres: 0 }),
  titreSection('6. Détail jour par jour'),
  tableau([1306, 1100, 1300, 1700, 1700, 1500, 1600], [
    ['Date', 'Nb ventes', 'Qté', 'Ventes (F)', 'Encaissé (F)', 'Dépenses (F)', 'Solde caisse (F)'],
    ['{#jours}{date}', '{nb_ventes}', '{qte}', '{ventes}', '{encaissements}', '{depenses}', '{solde_caisse}{/jours}'],
    ['Total', '{t_nb_ventes}', '{t_qte}', '{t_ventes}', '{t_encaissements}', '{t_depenses}', '{t_solde_caisse}']
  ], { derniereGras: true, aligns: ['left', D, D, D, D, D, D] }),
  para('{/afficher_detail}', { apres: 0 }),

  para('Rapport généré automatiquement par la plateforme BAMTI.', { align: 'center', taille: 16, couleur: '808080', avant: 240 })
].join('');

const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${corps}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;

const zip = new PizZip();
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
zip.file('word/document.xml', document);

fs.writeFileSync(SORTIE, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log('Modèle généré :', SORTIE);
