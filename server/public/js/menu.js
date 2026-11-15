// Comportement du menu latéral (views/partials/menu.ejs) :
// - un seul groupe ouvert à la fois ;
// - recherche d'une page (sans tenir compte des accents) ;
// - mémorisation du mode réduit (bouton ☰ du thème) d'une page à l'autre ;
// - après le chargement : réouverture du groupe de la page active et menu ramené en haut.
//
// Attention : au chargement, le thème (assets/js/app.js) remplace le contenu du menu par une copie,
// referme les groupes et fait défiler le menu. D'où les écouteurs posés sur `document` (ils survivent
// au remplacement) et la remise en état faite APRÈS le thème.
(function () {
  var CLE_TAILLE = 'bamti-menu-taille';
  var normaliser = function (s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  };
  var nav = function () { return document.getElementById('navbar-nav'); };

  // ── Un seul groupe ouvert à la fois ─────────────────────────────────────
  document.addEventListener('show.bs.collapse', function (e) {
    var menu = nav();
    if (!menu || !e.target.classList.contains('menu-dropdown') || !menu.contains(e.target)) return;
    menu.querySelectorAll('.menu-dropdown.show').forEach(function (autre) {
      if (autre !== e.target) fermerGroupe(menu, autre);
    });
  });

  function fermerGroupe(menu, groupe) {
    groupe.classList.remove('show');
    var lien = menu.querySelector('[href="#' + groupe.id + '"]');
    if (lien) { lien.classList.add('collapsed'); lien.setAttribute('aria-expanded', 'false'); }
  }

  function ouvrirGroupe(menu, groupe) {
    groupe.classList.add('show');
    var lien = menu.querySelector('[href="#' + groupe.id + '"]');
    if (lien) { lien.classList.remove('collapsed'); lien.setAttribute('aria-expanded', 'true'); }
  }

  // ── Recherche ───────────────────────────────────────────────────────────
  var etatInitial = null; // groupes ouverts avant la recherche, restaurés quand on vide le champ

  function filtrer(champ) {
    var menu = nav();
    if (!menu) return;
    var q = normaliser(champ.value);

    if (q && !etatInitial) {
      etatInitial = Array.prototype.map.call(menu.querySelectorAll('.menu-dropdown'), function (d) { return d.classList.contains('show'); });
    }

    var visibles = 0;
    menu.querySelectorAll(':scope > .nav-item').forEach(function (li) {
      if (li.classList.contains('menu-stock')) return;
      var tete = li.querySelector(':scope > .nav-link');
      var dropdown = li.querySelector(':scope > .menu-dropdown');
      var titre = normaliser(tete ? tete.textContent : '');

      if (!dropdown) {
        var ok = !q || titre.indexOf(q) >= 0;
        li.style.display = ok ? '' : 'none';
        if (ok) visibles++;
        return;
      }

      var groupeCorrespond = q && titre.indexOf(q) >= 0;
      var nb = 0;
      dropdown.querySelectorAll('.nav-item').forEach(function (sous) {
        var ok = !q || groupeCorrespond || normaliser(sous.textContent).indexOf(q) >= 0;
        sous.style.display = ok ? '' : 'none';
        if (ok) nb++;
      });
      li.style.display = nb ? '' : 'none';
      if (nb) visibles++;
      if (q) dropdown.classList.toggle('show', nb > 0);
    });

    // Titres de section : masqués si aucun élément visible jusqu'au titre suivant
    menu.querySelectorAll(':scope > .menu-title').forEach(function (titre) {
      var suivant = titre.nextElementSibling, aDuContenu = false;
      while (suivant && !suivant.classList.contains('menu-title') && suivant.id !== 'menuAucun') {
        if (suivant.style.display !== 'none' && !suivant.classList.contains('menu-stock')) { aDuContenu = true; break; }
        suivant = suivant.nextElementSibling;
      }
      titre.style.display = aDuContenu ? '' : 'none';
    });

    var aucun = document.getElementById('menuAucun');
    if (aucun) aucun.classList.toggle('d-none', !q || visibles > 0);

    if (!q && etatInitial) {
      menu.querySelectorAll('.menu-dropdown').forEach(function (d, i) { d.classList.toggle('show', etatInitial[i]); });
      etatInitial = null;
    }
  }

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'menuRecherche') filtrer(e.target);
  });
  document.addEventListener('keydown', function (e) {
    if (!e.target || e.target.id !== 'menuRecherche') return;
    if (e.key === 'Escape') { e.target.value = ''; filtrer(e.target); }
    // Entrée : ouvre le premier lien trouvé
    if (e.key === 'Enter') {
      var menu = nav();
      var premier = menu && Array.prototype.find.call(menu.querySelectorAll('a[href^="/"]'), function (a) { return a.offsetParent !== null; });
      if (premier) window.location.href = premier.getAttribute('href');
    }
  });

  // ── Mode réduit mémorisé ────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#topnav-hamburger-icon')) return;
    // Le thème change la taille pendant ce clic : on lit la nouvelle valeur juste après
    setTimeout(function () {
      var taille = document.documentElement.getAttribute('data-sidebar-size');
      try {
        if (taille === 'sm') localStorage.setItem(CLE_TAILLE, 'sm');
        else localStorage.removeItem(CLE_TAILLE);
        sessionStorage.setItem('data-sidebar-size', taille || 'lg');
      } catch (err) { /* stockage indisponible : le choix n'est simplement pas mémorisé */ }
    }, 0);
  });

  // ── Remise en état après le thème ───────────────────────────────────────
  // Le thème agit au chargement puis fait défiler le menu ~250 ms plus tard : on passe après lui.
  function remettreEnEtat() {
    var menu = nav();
    if (!menu) return;

    // Groupe de la page active rouvert, les autres fermés
    var actif = menu.querySelector('.menu-dropdown .nav-link.active');
    var groupeActif = actif ? actif.closest('.menu-dropdown') : null;
    menu.querySelectorAll('.menu-dropdown').forEach(function (g) {
      if (g === groupeActif) ouvrirGroupe(menu, g); else fermerGroupe(menu, g);
    });

    // Menu ramené en haut ; on ne défile que si la page active serait cachée, et juste assez pour la voir
    var conteneur = document.querySelector('.app-menu .simplebar-content-wrapper') || document.getElementById('scrollbar');
    if (!conteneur) return;
    conteneur.scrollTop = 0;
    var cible = actif || menu.querySelector('.nav-link.active');
    if (cible) {
      var bas = cible.getBoundingClientRect().bottom - conteneur.getBoundingClientRect().top;
      if (bas > conteneur.clientHeight) conteneur.scrollTop = bas - conteneur.clientHeight + 40;
    }
  }

  window.addEventListener('load', function () { setTimeout(remettreEnEtat, 400); });
})();
