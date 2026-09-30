// Impression du reçu d'une vente (pages ventes admin et caissier).
// Les données viennent de l'attribut data-recu (JSON) de la ligne <tr id="vente-{id}">.

(function () {
  function echapper(valeur) {
    return String(valeur ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formaterMontant(n) {
    return new Intl.NumberFormat('fr-FR').format(Math.round((Number(n) || 0) * 100) / 100) + ' FCFA';
  }

  // 'AAAA-MM-JJ' -> 'JJ/MM/AAAA'
  function formaterDate(dateISO) {
    const [annee, mois, jour] = String(dateISO).slice(0, 10).split('-');
    return `${jour}/${mois}/${annee}`;
  }

  // Numéro de reçu = date de la vente + id de la vente : REC-AAAAMMJJ-000123
  function numeroRecu(vente) {
    const date = String(vente.date_vente).slice(0, 10).replace(/-/g, '');
    return `REC-${date}-${String(vente.id).padStart(6, '0')}`;
  }

  const LIBELLES_TYPE_VENTE = { livrer: 'Livrée', usine: 'Usine' };
  const LIBELLES_TYPE_PAIEMENT = { total: 'Comptant', echellonner: 'Échelonné' };

  function blocRecu(vente, options) {
    const soldee = Number(vente.reste) <= 0;
    return `
      <section class="recu">
        ${options.mention ? `<div class="mention">${echapper(options.mention)}</div>` : ''}
        <header class="entete">
          <img src="${options.logo}" alt="BAMTI" class="logo">
          <div class="societe">
            <h1>Entreprise BAMTI</h1>
            <p>NIF : 64750/P</p>
            <p>SONUCI KOUBIA — Tél : 99 58 21 58 / 90 23 11 23</p>
          </div>
          <div class="numero">
            <span class="libelle">Reçu N°</span>
            <strong>${numeroRecu(vente)}</strong>
            <span class="libelle">Date de vente : ${formaterDate(vente.date_vente)}</span>
          </div>
        </header>

        <div class="infos">
          <div><span class="libelle">Client</span><strong>${echapper(vente.client)}</strong></div>
          <div><span class="libelle">Type de vente</span><strong>${echapper(LIBELLES_TYPE_VENTE[vente.type_vente] || vente.type_vente)}</strong></div>
          <div><span class="libelle">Paiement</span><strong>${echapper(LIBELLES_TYPE_PAIEMENT[vente.type_paiement] || vente.type_paiement)}</strong></div>
        </div>

        <table class="lignes">
          <thead>
            <tr>
              <th class="num">Quantité</th>
              <th class="num">Prix unitaire</th>
              <th class="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">${echapper(vente.quantite)}</td>
              <td class="num">${formaterMontant(vente.prix_unitaire)}</td>
              <td class="num">${formaterMontant(vente.montantTotal)}</td>
            </tr>
          </tbody>
        </table>

        <table class="totaux">
          <tr><td>Montant total</td><td class="num">${formaterMontant(vente.montantTotal)}</td></tr>
          <tr><td>Montant payé</td><td class="num">${formaterMontant(vente.montantPayes)}</td></tr>
          <tr class="reste ${soldee ? 'solde' : ''}">
            <td>Reste à payer</td>
            <td class="num">${soldee ? 'SOLDÉ' : formaterMontant(vente.reste)}</td>
          </tr>
        </table>

        ${options.signatures ? `
        <div class="signatures">
          <div><span class="trait"></span>Signature client</div>
          <div><span class="trait"></span>Signature responsable<br><small>${echapper(options.responsable)}</small></div>
        </div>` : ''}

        <footer class="pied">
          Imprimé le ${options.dateImpression} à ${options.heureImpression} — Merci pour votre confiance
          <div class="credit">LOGICIEL DEVELOPPE PAR AL-ITQUAN INFORMATION SYSTEM TEL 80728769</div>
        </footer>
      </section>`;
  }

  const STYLE = `
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; margin: 0; padding: 20px; background: #fff; }
    .recu { max-width: 720px; margin: 0 auto; border: 1.5px solid #1f4e8c; border-radius: 8px; padding: 18px 22px; position: relative; }
    .mention { position: absolute; top: -11px; right: 16px; background: #fff; border: 1px solid #1f4e8c; color: #1f4e8c;
               font-size: 11px; font-weight: 700; letter-spacing: .08em; padding: 2px 8px; border-radius: 4px; }
    .entete { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #1f4e8c; padding-bottom: 12px; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .societe { flex: 1; }
    .societe h1 { margin: 0 0 4px; font-size: 20px; color: #1f4e8c; }
    .societe p { margin: 0; font-size: 12px; color: #555; }
    .numero { text-align: right; border: 1px solid #1f4e8c; border-radius: 6px; padding: 6px 10px; }
    .numero strong { display: block; font-size: 15px; color: #1f4e8c; margin: 2px 0; font-family: Consolas, monospace; }
    .libelle { display: block; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .04em; }
    .infos { display: flex; gap: 10px; margin: 14px 0; }
    .infos > div { flex: 1; border: 1px solid #ccd6e4; border-radius: 6px; padding: 6px 10px; }
    .infos strong { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    .lignes th, .lignes td { border: 1px solid #9aa9bf; padding: 7px 9px; font-size: 13px; }
    .lignes th { background: #e8eef7; text-align: left; }
    .num { text-align: right; white-space: nowrap; }
    .totaux { width: 55%; margin: 10px 0 0 auto; }
    .totaux td { border: 1px solid #9aa9bf; padding: 6px 9px; font-size: 13px; }
    .totaux td:first-child { background: #f3f6fa; }
    .totaux .reste td { font-weight: 700; background: #fff4e0; }
    .totaux .reste.solde td { background: #e6f4ea; color: #1e7b34; }
    .signatures { display: flex; justify-content: space-between; margin-top: 34px; font-size: 13px; }
    .signatures > div { width: 42%; text-align: center; }
    .trait { display: block; border-bottom: 1px solid #333; height: 36px; margin-bottom: 4px; }
    .pied { margin-top: 16px; border-top: 1px dashed #9aa9bf; padding-top: 6px; text-align: center; font-size: 11px; color: #666; }
    .credit { margin-top: 3px; font-size: 9px; color: #888; letter-spacing: .03em; }
    .decoupe { max-width: 720px; margin: 22px auto; border-top: 1px dashed #666; text-align: center; font-size: 11px; color: #666; line-height: 0; }
    .decoupe span { background: #fff; padding: 0 8px; }
    @media print {
      body { padding: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .recu { break-inside: avoid; }
    }
    @page { size: A4; margin: 12mm; }

    /* Deux copies (client + caissier) : format compact pour tenir sur une seule page A4 */
    body.deux-copies { padding: 12px 0 0; }
    .deux-copies .recu { padding: 10px 16px; }
    .deux-copies .entete { padding-bottom: 8px; gap: 10px; }
    .deux-copies .logo { width: 52px; height: 52px; }
    .deux-copies .societe h1 { font-size: 17px; margin-bottom: 2px; }
    .deux-copies .societe p { font-size: 11px; }
    .deux-copies .numero { padding: 4px 8px; }
    .deux-copies .numero strong { font-size: 13px; }
    .deux-copies .infos { margin: 8px 0; }
    .deux-copies .infos > div { padding: 4px 8px; }
    .deux-copies .infos strong { font-size: 13px; }
    .deux-copies .lignes th, .deux-copies .lignes td,
    .deux-copies .totaux td { padding: 4px 8px; font-size: 12px; }
    .deux-copies .totaux { margin-top: 6px; }
    .deux-copies .signatures { margin-top: 12px; font-size: 12px; }
    .deux-copies .trait { height: 26px; }
    .deux-copies .pied { margin-top: 8px; padding-top: 4px; font-size: 10px; }
    .deux-copies .credit { margin-top: 2px; font-size: 8px; }
    .deux-copies .decoupe { margin: 14px auto; }
    @media print {
      .deux-copies .recu { max-width: none; }
    }
  `;

  // copieCaissier : ajoute sous le reçu client une copie à conserver par le caissier
  window.imprimerRecuVente = function (idVente, options = {}) {
    const row = document.querySelector(`#vente-${idVente}`);
    if (!row || !row.dataset.recu) return alert('Vente introuvable.');

    const vente = JSON.parse(row.dataset.recu);
    const maintenant = new Date();
    const commun = {
      logo: `${window.location.origin}/images/logo.png`,
      responsable: options.responsable || '',
      dateImpression: maintenant.toLocaleDateString('fr-FR'),
      heureImpression: maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    let contenu = blocRecu(vente, { ...commun, signatures: true, mention: options.copieCaissier ? 'COPIE CLIENT' : '' });
    if (options.copieCaissier) {
      contenu += `<div class="decoupe"><span>✂ découper ici</span></div>`;
      contenu += blocRecu(vente, { ...commun, signatures: true, mention: 'COPIE CAISSIER' });
    }

    const fenetre = window.open('', '_blank');
    fenetre.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Reçu ${numeroRecu(vente)} - BAMTI</title>
          <style>${STYLE}${options.copieCaissier ? '@page { margin: 8mm; }' : ''}</style>
        </head>
        <body class="${options.copieCaissier ? 'deux-copies' : ''}">
          ${contenu}
          <script>window.onload = function () { window.focus(); window.print(); };<\/script>
        </body>
      </html>`);
    fenetre.document.close();
  };
})();
