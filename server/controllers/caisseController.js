// Clôture de caisse : écrans « Ma caisse », « À recevoir » et « Suivi » (règles dans services/caisse.js)
const { Op } = require('sequelize');
const db = require('../models');
const caisse = require('../services/caisse');
const { aujourdhui, ajouterJours } = require('../services/rapport/periode');

const { User, sequelize } = db;

function redirectWithMessage(req, res, msg, type, path) {
  req.flash('message', { text: msg, type });
  return res.redirect(path);
}

function vars(req, extra) {
  return { message: req.flash('message')[0] || null, ...extra };
}

// Exécute une action du service dans une transaction ; les ErreurCaisse sont affichées à l'utilisateur
async function executer(req, res, retour, action, succes) {
  const t = await sequelize.transaction();
  try {
    const resultat = await action(t);
    await t.commit();
    return redirectWithMessage(req, res, succes(resultat), 'success', retour);
  } catch (err) {
    await t.rollback();
    if (err instanceof caisse.ErreurCaisse) return redirectWithMessage(req, res, err.message, 'danger', retour);
    console.error('[Caisse]', err);
    return redirectWithMessage(req, res, 'Erreur lors de l’enregistrement. Réessayez.', 'danger', retour);
  }
}

// ── GET /caisse/index : journées à clôturer, ce que je détiens, mes remises envoyées ─────
exports.index = async (req, res) => {
  const user = req.session.user;
  try {
    const peutRemettre = caisse.peutCloturer(user.profil);
    const [aCloturer, detenues, destinataires, envoyees] = await Promise.all([
      peutRemettre ? caisse.journeesACloturer(user.id) : [],
      caisse.journeesDetenues(user),
      caisse.destinatairesPossibles(user),
      caisse.remises({ where: { id_expediteur: user.id }, limit: 30 })
    ]);

    res.render('caisse/index', vars(req, {
      pageTitle: 'Ma caisse',
      peutRemettre,
      aCloturer,
      detenues,
      destinataires,
      envoyees,
      dateDebut: caisse.DATE_DEBUT
    }));
  } catch (err) {
    console.error('[Caisse] index :', err);
    return redirectWithMessage(req, res, 'Erreur lors du chargement de la caisse.', 'danger', '/');
  }
};

// ── POST /caisse/cloturer ───────────────────────────────────────────────────────
exports.cloturer = (req, res) => {
  const { date, id_destinataire, montant, commentaire } = req.body;
  return executer(req, res, '/caisse/index',
    t => caisse.cloturer({ user: req.session.user, date, idDestinataire: id_destinataire, montant, commentaire, transaction: t }),
    ({ destinataire }) => `Journée du ${caisse.dateFR(date)} clôturée. Remise envoyée à ${destinataire.nom} : elle reste chez vous tant qu’il ne l’a pas reçue.`);
};

// ── POST /caisse/remettre : une ou plusieurs journées détenues, un montant par journée ─────
exports.remettre = (req, res) => {
  const choisies = [].concat(req.body.journees || []);
  const lignes = choisies.map(id => ({
    id_journee: id,
    montant: req.body[`montant_${id}`],
    commentaire: req.body[`commentaire_${id}`]
  }));
  return executer(req, res, '/caisse/index',
    t => caisse.creerRemise({ expediteur: req.session.user, idDestinataire: req.body.id_destinataire, lignes, transaction: t }),
    ({ destinataire }) => `Remise envoyée à ${destinataire.nom} (${lignes.length} journée${lignes.length > 1 ? 's' : ''}) : elle reste chez vous tant qu’il ne l’a pas reçue.`);
};

// ── POST /caisse/remises/:id/annuler ───────────────────────────────────────────
exports.annuler = (req, res) => executer(req, res, '/caisse/index',
  t => caisse.annuler({ user: req.session.user, idRemise: req.params.id, transaction: t }),
  () => 'Remise annulée : vous pouvez la corriger et la renvoyer.');

// ── GET /caisse/recevoir : remises qui me sont adressées ─────────────────────────
exports.recevoir = async (req, res) => {
  const user = req.session.user;
  try {
    const [enAttente, traitees] = await Promise.all([
      caisse.remises({ where: { id_destinataire: user.id, statut: 'en_attente' } }),
      caisse.remises({ where: { id_destinataire: user.id, statut: { [Op.in]: ['recue', 'refusee'] } }, limit: 30 })
    ]);
    res.render('caisse/recevoir', vars(req, { pageTitle: 'Remises à recevoir', enAttente, traitees }));
  } catch (err) {
    console.error('[Caisse] recevoir :', err);
    return redirectWithMessage(req, res, 'Erreur lors du chargement des remises.', 'danger', '/');
  }
};

// ── POST /caisse/remises/:id/accepter ──────────────────────────────────────────
exports.accepter = (req, res) => executer(req, res, '/caisse/recevoir',
  t => caisse.accepter({ user: req.session.user, idRemise: req.params.id, transaction: t }),
  () => 'Remise reçue : l’argent est maintenant chez vous.');

// ── POST /caisse/remises/:id/refuser ───────────────────────────────────────────
exports.refuser = (req, res) => executer(req, res, '/caisse/recevoir',
  t => caisse.refuser({ user: req.session.user, idRemise: req.params.id, commentaire: req.body.commentaire_refus, transaction: t }),
  () => 'Remise refusée : l’argent reste chez l’expéditeur, qui doit la corriger et la renvoyer.');

// ── GET /caisse/suivi?du=&au=&caissier= ───────────────────────────────────────
exports.suivi = async (req, res) => {
  const user = req.session.user;
  const valide = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  const fin = valide(req.query.au) ? req.query.au : aujourdhui();
  let debut = valide(req.query.du) ? req.query.du : ajouterJours(fin, -6);
  if (debut < caisse.DATE_DEBUT) debut = caisse.DATE_DEBUT;
  const idCaissier = user.profil === 'caissier' ? null : (Number(req.query.caissier) || null);

  try {
    const [journees, caissiers] = await Promise.all([
      caisse.suivi({ user, du: debut, au: fin, idCaissier }),
      user.profil === 'caissier' ? [] : User.findAll({
        attributes: ['id', 'nom'],
        where: { profil: ['caissier', 'gestionnaire'] },
        order: [['nom', 'ASC']]
      })
    ]);

    res.render('caisse/suivi', vars(req, {
      pageTitle: 'Suivi de la caisse',
      journees,
      caissiers,
      filtre: { du: debut, au: fin, caissier: idCaissier },
      dateDebut: caisse.DATE_DEBUT
    }));
  } catch (err) {
    console.error('[Caisse] suivi :', err);
    return redirectWithMessage(req, res, 'Erreur lors du chargement du suivi.', 'danger', '/caisse/index');
  }
};
