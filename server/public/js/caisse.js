// Ma caisse (views/caisse/index.ejs) : le champ commentaire n'apparaît que si le montant remis
// est inférieur au montant attendu, et devient alors obligatoire (seulement pour les journées cochées
// dans la remise groupée). Le serveur refait les mêmes contrôles (services/caisse.js).
(function () {
  var fmt = function (n) { return new Intl.NumberFormat('fr-FR').format(n); };

  function majLigne(ligne) {
    var champ = ligne.querySelector('.montant-remis');
    if (!champ) return;
    var attendu = Number(champ.dataset.attendu) || 0;
    var remis = champ.value === '' ? attendu : Number(champ.value);
    var ecart = Math.round((attendu - remis) * 100) / 100;

    var zone = ligne.querySelector('.zone-commentaire');
    var sans = ligne.querySelector('.sans-ecart');
    var texte = ligne.querySelector('.texte-ecart');
    var commentaire = zone && zone.querySelector('textarea');
    var coche = ligne.querySelector('input[name="journees"]');
    var concernee = !coche || coche.checked;

    var avecEcart = ecart > 0;
    if (zone) zone.classList.toggle('d-none', !avecEcart);
    if (sans) sans.classList.toggle('d-none', avecEcart);
    if (texte) texte.textContent = avecEcart ? 'Écart : ' + fmt(ecart) + ' F' : '';
    if (commentaire) commentaire.required = avecEcart && concernee;
  }

  document.querySelectorAll('.ligne-journee').forEach(function (ligne) {
    majLigne(ligne);
    ligne.addEventListener('input', function () { majLigne(ligne); });
    ligne.addEventListener('change', function () { majLigne(ligne); });
  });

  // Case « tout cocher » de la remise groupée
  var tout = document.getElementById('toutCocher');
  if (tout) {
    tout.addEventListener('change', function () {
      document.querySelectorAll('#formRemise input[name="journees"]').forEach(function (c) {
        c.checked = tout.checked;
        majLigne(c.closest('.ligne-journee'));
      });
    });
  }
})();
