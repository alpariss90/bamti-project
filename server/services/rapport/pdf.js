// Génération du document de rapport : docxtemplater (modèle Word) -> LibreOffice -> PDF
const path = require('path');
const fs = require('fs');
const util = require('util');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const libre = require('libreoffice-convert');
const { titreRapport, timezone } = require('./periode');

const convertir = util.promisify(libre.convert);

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'public', 'modeldoc', 'rapport_activite.docx');

const LIBELLES = {
  livrer: 'Livraison',
  usine: 'Usine',
  total: 'Paiement total',
  echellonner: 'Paiement échelonné'
};

// Espace insécable classique (l'espace fine d'Intl n'existe pas dans toutes les polices)
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/\s/g, ' ');
}

function construireContexte(periode, d) {
  return {
    titre: titreRapport(periode.type),
    periode: periode.libelle,
    date_generation: new Date().toLocaleString('fr-FR', { timeZone: timezone() }),

    s_ventes: fmt(d.ventes.montant),
    s_encaissements: fmt(d.encaissements.total),
    s_depenses: fmt(d.depenses.total),
    s_resultat: fmt(d.ventes.montant - d.depenses.total),
    s_solde_caisse: fmt(d.encaissements.total - d.depenses.total),

    v_nb: fmt(d.ventes.nb),
    v_qte: fmt(d.ventes.qte),
    v_montant: fmt(d.ventes.montant),
    ventes_par_type: d.ventes.parType.map(r => ({
      libelle: LIBELLES[r.type] || r.type, nb: fmt(r.nb), qte: fmt(r.qte), montant: fmt(r.montant)
    })),
    ventes_par_paiement: d.ventes.parPaiement.map(r => ({
      libelle: LIBELLES[r.type] || r.type, nb: fmt(r.nb), montant: fmt(r.montant)
    })),

    e_periode: fmt(d.encaissements.surPeriode),
    e_recouvrement: fmt(d.encaissements.recouvrement),
    e_total: fmt(d.encaissements.total),
    e_reste_periode: fmt(d.encaissements.restePeriode),
    e_creances_totales: fmt(d.encaissements.creancesTotales),

    d_nb: fmt(d.depenses.nb),
    d_total: fmt(d.depenses.total),
    depenses_par_type: d.depenses.parType.map(r => ({
      libelle: r.type, nb: fmt(r.nb), montant: fmt(r.montant)
    })),

    st_initial: fmt(d.stock.initial),
    st_entrees: fmt(d.stock.entrees),
    st_sorties: fmt(d.stock.sorties),
    st_final: fmt(d.stock.final),

    // Détail jour par jour : uniquement pour les rapports hebdomadaire et mensuel
    afficher_detail: periode.type !== 'journalier',
    jours: d.jours.map(j => ({
      date: j.date,
      nb_ventes: fmt(j.nb_ventes),
      qte: fmt(j.qte),
      ventes: fmt(j.ventes),
      encaissements: fmt(j.encaissements),
      depenses: fmt(j.depenses),
      solde_caisse: fmt(j.solde_caisse)
    })),
    t_nb_ventes: fmt(d.ventes.nb),
    t_qte: fmt(d.ventes.qte),
    t_ventes: fmt(d.ventes.montant),
    t_encaissements: fmt(d.encaissements.total),
    t_depenses: fmt(d.depenses.total),
    t_solde_caisse: fmt(d.encaissements.total - d.depenses.total)
  };
}

// Retourne { buffer, extension, contentType }.
// Si LibreOffice est indisponible, le .docx est renvoyé à la place du PDF.
async function genererDocument(periode, donnees) {
  const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH, 'binary'));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(construireContexte(periode, donnees));
  const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

  try {
    const pdfBuffer = await convertir(docxBuffer, '.pdf', undefined);
    return { buffer: pdfBuffer, extension: 'pdf', contentType: 'application/pdf' };
  } catch (err) {
    console.error('[Rapport] Conversion PDF impossible, envoi du .docx à la place :', err);
    return {
      buffer: docxBuffer,
      extension: 'docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }
}

module.exports = { genererDocument, fmt };
