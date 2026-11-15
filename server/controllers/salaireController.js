const db = require("../models");

const MOIS_FR = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Message affiché sur la page Salaire, en restant sur le mois choisi
function redirectWithMessage(req, res, text, type, mois, annee, details) {
  req.flash("message", { text, type, details });
  const periode = mois && annee ? `?mois=${mois}&annee=${annee}` : '';
  return res.redirect(`/salaire/index${periode}`);
}

const arrondi = n => Math.round((Number(n) || 0) * 100) / 100;
const fcfa = n => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

exports.afficherSalaires = async (req, res) => {
  try {
    const mois = parseInt(req.query.mois, 10) || new Date().getMonth() + 1; // mois actuel par défaut
    const annee = parseInt(req.query.annee, 10) || new Date().getFullYear(); // année actuelle par défaut

    let result = [];
    if (req.query.mois) {
      [result] = await db.sequelize.query(
        `SELECT * FROM vsalaires vs WHERE vs.mois = :m AND vs.annee = :a;`,
        { replacements: { m: mois, a: annee } }
      );
    }

    res.render("salaire/index", {
      pageTitle: "Gestion des salaires",
      selectedMois: mois,
      selectedAnnee: annee,
      message: req.flash("message")[0] || null,
      salaires: result || []
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur lors du chargement des salaires.");
  }
};

exports.validerSalaires = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { mois, annee, selection, salaire, credit, gratification } = req.body;

    if (!selection || selection.length === 0) {
      await t.rollback();
      return res.status(400).send("Aucun personnel sélectionné.");
    }

    const now = new Date();

    for (const id_personnel of Array.isArray(selection)
      ? selection
      : [selection]) {
      const personnel = await db.Personnels.findByPk(id_personnel);

      const montant_salaire = parseFloat(
        salaire?.[id_personnel] ?? personnel.salaire ?? 0
      );
      const montant_credit = parseFloat(credit?.[id_personnel] ?? 0);
      const montant_gratification = parseFloat(
        gratification?.[id_personnel] ?? 0
      );

      // Vérifier si le salaire existe pour ce mois/année
      const [exist] = await db.sequelize.query(
        `SELECT id FROM salaires 
         WHERE id_personnel = :id_personnel
           AND mois = :mois
           AND annee = :annee`,
        { replacements: { id_personnel, mois, annee }, transaction: t }
      );

      if (exist.length > 0) {
        // Mise à jour
        await db.sequelize.query(
          `UPDATE salaires
           SET montant_salaire = :montant_salaire,
               montant_credit = :montant_credit,
               montant_gratification = :montant_gratification,
               updated_at = :updated_at
           WHERE id_personnel = :id_personnel
             AND mois = :mois
             AND annee = :annee`,
          {
            replacements: {
              id_personnel,
              montant_salaire,
              montant_credit,
              montant_gratification,
              updated_at: now,
              mois,
              annee,
            },
            transaction: t,
          }
        );
      } else {
        // Insertion
        await db.sequelize.query(
          `INSERT INTO salaires 
             (id_personnel, montant_salaire, montant_credit, montant_gratification, mois, annee, created_at, deleted_at)
           VALUES 
             (:id_personnel, :montant_salaire, :montant_credit, :montant_gratification, :mois, :annee, :created_at, NULL)`,
          {
            replacements: {
              id_personnel,
              montant_salaire,
              montant_credit,
              montant_gratification,
              mois,
              annee,
              created_at: now,
            },
            transaction: t,
          }
        );
      }
    }

    await t.commit();
    res.redirect(`/salaire?mois=${mois}&annee=${annee}`);
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).send("Erreur lors de la validation des salaires.");
  }
};

// Génération de la paie d'un mois pour tout le personnel actif.
// Salaire = base − retenues − jours non payés ; À payer = Salaire + crédits + gratifications.
// Si un salaire ou un « à payer » est négatif, rien n'est généré (rollback) et les personnels en cause sont listés.
exports.execute = async (req, res) => {
  const { mois, annee, btn_salaire } = req.body;

  if (!mois || mois === '0' || !annee || annee === '0') {
    return redirectWithMessage(req, res, "Veuillez sélectionner un mois et une année.", 'danger');
  }

  if (btn_salaire !== "execute") {
    return res.redirect(`/salaire/index?mois=${mois}&annee=${annee}`);
  }

  const periode = `${MOIS_FR[mois] || mois} ${annee}`;
  const t = await db.sequelize.transaction();

  try {
    // Paie déjà générée pour ce mois ?
    const [exist] = await db.sequelize.query(
      `SELECT id FROM salaires WHERE mois = :mois AND annee = :annee LIMIT 1`,
      { replacements: { mois, annee }, transaction: t }
    );
    if (exist.length > 0) {
      await t.rollback();
      return redirectWithMessage(req, res, `Le salaire de ${periode} a déjà été effectué.`, 'warning', mois, annee);
    }

    // Tout le personnel actif doit avoir un salaire de base
    const [sansSalaire] = await db.sequelize.query(
      `SELECT p.nom, p.prenom FROM personnels p
       WHERE p.etat = 1 AND p.id NOT IN (SELECT id_personnel FROM montant_personnel)`,
      { transaction: t }
    );
    if (sansSalaire.length > 0) {
      await t.rollback();
      const noms = sansSalaire.map(p => `${p.nom} ${p.prenom || ''}`.trim()).join(', ');
      return redirectWithMessage(req, res,
        `Ces personnels n'ont pas de salaire défini : ${noms}. Définissez leur salaire (Montant mis à jour) avant de générer la paie.`,
        'danger', mois, annee);
    }

    // Personnel actif + salaire de base
    const [personnels] = await db.sequelize.query(
      `SELECT p.id, p.nom, p.prenom, m.salaire
       FROM personnels p JOIN montant_personnel m ON m.id_personnel = p.id
       WHERE p.etat = 1`,
      { transaction: t }
    );

    // Avances du mois, totalisées par personnel et par type
    const [avances] = await db.sequelize.query(
      `SELECT id_personnel, type, SUM(montant) AS total
       FROM personnel_avances
       WHERE mois = :mois AND annee = :annee
       GROUP BY id_personnel, type`,
      { replacements: { mois, annee }, transaction: t }
    );
    const totalAvance = (id, type) => {
      const ligne = avances.find(a => Number(a.id_personnel) === Number(id) && a.type === type);
      return ligne ? Number(ligne.total) : 0;
    };

    const now = new Date();
    const lignes = [];
    const erreurs = [];

    for (const p of personnels) {
      const salaire_base = arrondi(p.salaire);
      const montant_retenue = arrondi(Math.abs(totalAvance(p.id, 'retenue')));
      const montant_jours_non_payes = arrondi(Math.abs(totalAvance(p.id, 'jours_non_payes')));
      const montant_credit = arrondi(totalAvance(p.id, 'credit'));              // négatif
      const montant_gratification = arrondi(totalAvance(p.id, 'gratification')); // positif

      const montant_salaire = arrondi(salaire_base - montant_retenue - montant_jours_non_payes);
      const a_payer = arrondi(montant_salaire + montant_credit + montant_gratification);
      const nom = `${p.nom} ${p.prenom || ''}`.trim();

      if (montant_salaire < 0) {
        erreurs.push(`${nom} : salaire négatif (${fcfa(montant_salaire)})`);
      } else if (a_payer < 0) {
        erreurs.push(`${nom} : montant à payer négatif (${fcfa(a_payer)})`);
      }

      lignes.push({
        id_personnel: p.id, mois, annee,
        salaire_base, montant_retenue, montant_jours_non_payes,
        montant_salaire, montant_credit, montant_gratification,
        createdAt: now, updatedAt: now
      });
    }

    if (erreurs.length > 0) {
      await t.rollback();
      return redirectWithMessage(req, res,
        `Le salaire de ${periode} n'a pas été généré. Corrigez les avances de ce mois pour ces personnels, puis relancez :`,
        'danger', mois, annee, erreurs);
    }

    await db.Salaire.bulkCreate(lignes, { transaction: t });
    await t.commit();

    return redirectWithMessage(req, res, `Salaire de ${periode} généré pour ${lignes.length} personnel(s).`, 'success', mois, annee);
  } catch (error) {
    await t.rollback();
    console.error('Erreur lors de la génération des salaires :', error);
    return redirectWithMessage(req, res, "Erreur lors de la génération des salaires.", 'danger', mois, annee);
  }
};
