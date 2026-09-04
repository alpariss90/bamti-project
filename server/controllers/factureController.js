const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const libre = require('libreoffice-convert');
const { montantEnLettres } = require('../utils/nombreEnLettres');

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'modeldoc', 'facture_proforma.docx');

function redirectWithMessage(req, res, msg, type = 'success', path_ = '/facture/proforma') {
  req.flash('message', { text: msg, type });
  return res.redirect(path_);
}

function formatMontant(n) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

// =======================
// Formulaire de facture proforma
// =======================
exports.proformaForm = (req, res) => {
  res.render('facture/proforma', {
    message: req.flash('message')[0] || null,
    pageTitle: 'Facture Proforma'
  });
};

// =======================
// Génère la facture proforma (docxtemplater -> docx -> pdf) et la renvoie directement
// =======================
exports.proformaGenerate = async (req, res) => {
  const { client_nom, quantite, prix_unitaire, date_facture } = req.body;

  if (!client_nom || !quantite || !prix_unitaire || !date_facture) {
    return redirectWithMessage(req, res, 'Tous les champs sont obligatoires.', 'danger');
  }

  const qte = parseInt(quantite, 10);
  const prix = parseFloat(prix_unitaire);

  if (!qte || qte <= 0) {
    return redirectWithMessage(req, res, 'La quantité doit être un nombre positif.', 'danger');
  }
  if (!prix || prix <= 0) {
    return redirectWithMessage(req, res, 'Le prix unitaire doit être un nombre positif.', 'danger');
  }

  try {
    const montant = qte * prix;
    const numeroFacture = `PF-${Date.now()}`;
    const dateFmt = new Date(date_facture).toLocaleDateString('fr-FR');

    const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render({
      numero_facture: numeroFacture,
      date_facture: dateFmt,
      client_nom: client_nom.trim(),
      designation: 'Sachet Pure Water',
      quantite: qte,
      prix_unitaire: formatMontant(prix),
      montant: formatMontant(montant),
      montant_lettres: montantEnLettres(montant)
    });

    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });
    const fileBase = `facture_proforma_${numeroFacture}`;

    libre.convert(docxBuffer, '.pdf', undefined, (err, pdfBuffer) => {
      if (err) {
        // LibreOffice absent ou conversion impossible : on renvoie quand même le .docx généré
        console.error('Conversion PDF impossible, envoi du .docx à la place :', err);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.docx"`);
        return res.send(docxBuffer);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileBase}.pdf"`);
      return res.send(pdfBuffer);
    });
  } catch (error) {
    console.error('Erreur lors de la génération de la facture proforma :', error);
    return redirectWithMessage(req, res, 'Erreur lors de la génération de la facture proforma.', 'danger');
  }
};
