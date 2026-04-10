//const { QueryTypes } = require('sequelize');
//const sequelize = require('../config/database');
//const { Client, Vente, Personnel, Salaire } = require('../models');

const db = require("../models");
const { Client, Vente, Salaire, Personnel } = db;
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
//const { Sequelize, Op } = require('sequelize');

/**
 * Redirection avec message flash
 */
function redirectWithMessage(
  req,
  res,
  msg,
  type = "success",
  path = "/dashboard/index",
) {
  req.flash(type, msg);
  return res.redirect(path);
}

exports.index = async (req, res) => {
  try {
    // --- Date courante ---
    const now = new Date();
    const currentMonth = req.params.mois || now.getMonth() + 1;
    const currentYear = req.params.annee || now.getFullYear();



    //console.log(currentMonth+'++++++++++++++++++++++++++++'+req.params.);
    
    // --- 1. Données de la vue situation_general (Aperçu Général) ---
    const [situationGeneral] = await sequelize.query(
      "SELECT * FROM situation_general",
      { type: QueryTypes.SELECT },
    );

    // --- 2. Récupérer les données pour le graphique Évolution des Ventes et Dépenses ---
    // Ventes par mois pour l'année en cours
    const ventesParMois = await sequelize.query(
      `WITH months AS (
  SELECT 1 as mois UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 
  UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
)
SELECT 
    m.mois,
    COALESCE(SUM(v.total_ventes), 0) as total_ventes
FROM months m
LEFT JOIN situation_detail_vente v 
    ON m.mois = v.mois 
    AND v.annee = :currentYear 
    AND v.mois IS NOT NULL 
    AND v.jour IS NULL
GROUP BY m.mois
ORDER BY m.mois`,
      {
        replacements: { currentYear },
        type: QueryTypes.SELECT,
      },
    );

    // Dépenses par mois pour l'année en cours
    const depensesParMois = await sequelize.query(
      `WITH months AS (
  SELECT 1 as mois UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 
  UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
)
SELECT 
    m.mois,
    COALESCE(SUM(d.total_depenses), 0) as total_depenses
FROM months m
LEFT JOIN situation_detail_depense d 
    ON m.mois = d.mois 
    AND d.annee = :currentYear 
    AND d.mois IS NOT NULL 
    AND d.jour IS NULL
    AND d.type_depense IS NOT NULL
GROUP BY m.mois
ORDER BY m.mois`,
      {
        replacements: { currentYear },
        type: QueryTypes.SELECT,
      },
    );

    // Formater les données pour le graphique
    const moisLabels = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];

    // Initialiser les tableaux avec des zéros
    let ventesMoisData = Array(12).fill(0);
    let depensesMoisData = Array(12).fill(0);

    // Remplir avec les données réelles
    ventesParMois.forEach((v) => {
      //if (v.mois >= 1 && v.mois <= 12) {
      ventesMoisData[v.mois - 1] = v.total_ventes || 0;
      //}
    });

    depensesParMois.forEach((d) => {
      //if (d.mois >= 1 && d.mois <= 12) {
      depensesMoisData[d.mois - 1] = d.total_depenses || 0;
      //}
    });

    // --- 3. Données pour le graphique Journalier (mois en cours) ---
    /*const ventesJournalieres = await sequelize.query(
      `SELECT 
        DAY(jour) as jour,
        SUM(total_ventes) as total_ventes
      FROM situation_detail_vente 
      WHERE annee = :currentYear 
        AND mois = :currentMonth
        AND jour IS NOT NULL
        AND type_vente IS NULL
      GROUP BY jour
      ORDER BY jour`,
      {
        replacements: { currentYear, currentMonth },
        type: QueryTypes.SELECT,
      },
    );*/

   /* const ventesJournalieres = await sequelize.query(
      `SELECT 
    DATE(jour) as date_vente,
    DAY(jour) as jour,
    SUM(total_ventes) as total_ventes
FROM situation_detail_vente 
WHERE jour >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    AND jour <= CURDATE()
    AND type_vente IS NULL
GROUP BY DATE(jour)
ORDER BY DATE(jour)`,
      {
        replacements: { currentYear, currentMonth },
        type: QueryTypes.SELECT,
      },
    );*/

    //const depensesJournalieres = 0;
    /*const depensesJournalieres = await sequelize.query(
      `SELECT 
        DAY(jour) as jour,
        SUM(total_depenses) as total_depenses
      FROM situation_detail_depense 
      WHERE annee = :currentYear 
        AND mois = :currentMonth
        AND jour IS NOT NULL
        AND type_depense IS NULL
      GROUP BY jour
      ORDER BY jour`,
      {
        replacements: { currentYear, currentMonth },
        type: QueryTypes.SELECT,
      },
    );*/

    const depensesVentesJournalieres = await sequelize.query(
      `select * from situation_depense_vente_30`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );

    const ventesAnnulees = await sequelize.query(
      `select coalesce(count(*), 0) as nbre from ventes_annuler`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );

    const venteParType = await sequelize.query(
      `SELECT type_vente, nombre_ventes, total_ventes FROM situation_detail_vente WHERE annee is null and mois is null and jour is null and type_vente is not null`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );

    let typeVenteLabels = Array(10).fill('');
    let montantTypeVente = Array(10).fill(0);
 
    venteParType.forEach((v, i) => {
      typeVenteLabels[i] = v.type_vente;
    });

    venteParType.forEach((v, i) => {
      montantTypeVente[i] = v.total_ventes;
    });

    const depenseParType = await sequelize.query(
      `SELECT type_depense,nombre_depenses,total_depenses FROM situation_detail_depense WHERE annee is null and mois is null and jour is null and type_depense is not null`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );

    let typeDepenseLabels = Array(25).fill('');
    let montantTypeDepense = Array(25).fill(0);
 
    depenseParType.forEach((v, i) => {
      typeDepenseLabels[i] = v.type_depense;
    });

    depenseParType.forEach((v, i) => {
      montantTypeDepense[i] = v.total_depenses;
    });



    

    // Formater les données journalières
  /*  const joursDansMois = new Date(currentYear, currentMonth, 0).getDate();
    let ventesJourData = Array(joursDansMois).fill(0);
    let depensesJourData = Array(joursDansMois).fill(0);

    ventesJournalieres.forEach((v) => {
      if (v.jour >= 1 && v.jour <= joursDansMois) {
        ventesJourData[v.jour - 1] = parseFloat(v.total_ventes) || 0;
      }
    });

    depensesJournalieres.forEach((d) => {
      if (d.jour >= 1 && d.jour <= joursDansMois) {
        depensesJourData[d.jour - 1] = parseFloat(d.total_depenses) || 0;
      }
    });*/

    let jours30 = Array(30).fill('');
    let ventes30 = Array(30).fill(0);
    let depenses30 = Array(30).fill(0);

    depensesVentesJournalieres.forEach((v, i) => {
      jours30[i] = v.date_jour;
    });

    depensesVentesJournalieres.forEach((v, i) => {
      depenses30[i] = v.total_depenses;
    });

    depensesVentesJournalieres.forEach((v, i) => {
      ventes30[i] = v.total_ventes;
    });


    console.log(jours30+'-'+ventes30+'-'+depenses30);
    

    // --- 4. Top 5 Clients (utilisation de votre requête existante) ---
    
    const topVentes = await sequelize.query(
      `SELECT * from tendant_client_10`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );
   


    const paiementRetard = await sequelize.query(
      `SELECT count(id) as nbre from paiement_retard `,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );



    const paiementRetardClient = await sequelize.query(
      `select count(id) as nbre from clients where id in (select v.id_client from ventes v join paiement_retard p on p.id=v.id) `,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );


    
   


const bestMois = await sequelize.query(
      `SELECT annee, mois, sum(total_ventes) as total FROM situation_detail_vente WHERE jour is null and mois is not null and annee is not null group by annee, mois order by sum(total_ventes) desc limit 1`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );

  




    // --- 5. Dépenses par catégorie pour l'année en cours ---
    const depensesParCategorie = await sequelize.query(
      `SELECT 
        type_depense,
        SUM(total_depenses) as total_depenses,
        ROUND(SUM(total_depenses) * 100.0 / (SELECT SUM(total_depenses) 
          FROM situation_detail_depense 
          WHERE annee = :currentYear 
            AND type_depense IS NOT NULL 
            AND mois IS NULL 
            AND jour IS NULL), 1) as pourcentage
      FROM situation_detail_depense 
      WHERE annee = :currentYear 
        AND type_depense IS NOT NULL 
        AND mois IS NULL 
        AND jour IS NULL
      GROUP BY type_depense
      ORDER BY total_depenses DESC`,
      {
        replacements: { currentYear },
        type: QueryTypes.SELECT,
      },
    );

    // --- 6. Ventes par type de client ---
    const ventesParTypeClient = await sequelize.query(
      `SELECT 
        type_vente,
        SUM(total_ventes) as total_ventes,
        ROUND(SUM(total_ventes) * 100.0 / (SELECT SUM(total_ventes) 
          FROM situation_detail_vente 
          WHERE annee = :currentYear 
            AND type_vente IS NOT NULL 
            AND mois IS NULL 
            AND jour IS NULL), 1) as pourcentage
      FROM situation_detail_vente 
      WHERE annee = :currentYear 
        AND type_vente IS NOT NULL 
        AND mois IS NULL 
        AND jour IS NULL
      GROUP BY type_vente
      ORDER BY total_ventes DESC`,
      {
        replacements: { currentYear },
        type: QueryTypes.SELECT,
      },
    );

    // --- 7. Nombre total de clients ---
    const totalClients = await Client.count({ where: { deletedAt: null } });

    // --- 8. Calcul du montant en caisse (total_vente - montant_credit) ---
    const montantCaisse =
      parseFloat(situationGeneral.total_vente || 0) -
      parseFloat(situationGeneral.montant_credit || 0);

    //console.log(ventesMoisData);

    //console.log(ventesParMois);

    //console.log(depensesMoisData);

    // --- Rendu de la vue ---
    res.render("dashboard/index", {
      pageTitle: "Tableau de Bord Direction",

      // Données Aperçu Général
      situationGeneral: {
        totalVente: parseFloat(situationGeneral.total_vente || 0),
        montantPaiement: parseFloat(situationGeneral.montant_paiement || 0),
        montantCredit: parseFloat(situationGeneral.montant_credit || 0),
        totalDepense: parseFloat(situationGeneral.total_depense || 0),
        totalSalaire: parseFloat(situationGeneral.total_salaire || 0),
        montantCaisse: montantCaisse,
      },

      // Graphiques mensuels
      ventesMensuelles: ventesMoisData,
      depensesMensuelles: depensesMoisData,
      moisLabels: moisLabels,
      typeVenteLabels : typeVenteLabels,
      montantTypeVente : montantTypeVente,
      typeDepenseLabels : typeDepenseLabels,
      montantTypeDepense : montantTypeDepense,

      // Graphiques journaliers
      ventesJournalieres: ventes30,
      depensesJournalieres: depenses30,
      joursLabels: jours30,

      // Autres données
      topVentes: topVentes,
      depensesParCategorie: depensesParCategorie,
      ventesParTypeClient: ventesParTypeClient,
      totalClients: totalClients,

      // Dates
      yr: currentYear,
      mnt: currentMonth,

      paiementRetard: paiementRetard[0],
      paiementRetardClient:paiementRetardClient[0],

      bestMois: bestMois[0],
      ventesAnnulees: ventesAnnulees[0],

      // Session
      user: req.session.user || null,
      message: req.flash("message")[0] || null,
    });
  } catch (err) {
    console.error(
      "❌ Erreur lors du chargement du tableau de bord direction :",
      err,
    );
    return redirectWithMessage(
      req,
      res,
      "Erreur lors du chargement du tableau de bord direction.",
      "danger",
      "/dashboard/direction",
    );
  }
};

// Route API pour les données journalières (pour l'actualisation dynamique)
exports.getDailyData = async (req, res) => {
  try {
    const { year, month } = req.params;

    const ventesJournalieres = await sequelize.query(
      `SELECT 
        DAY(jour) as jour,
        SUM(total_ventes) as total_ventes
      FROM situation_detail_vente 
      WHERE annee = :year 
        AND mois = :month
        AND jour IS NOT NULL
        AND type_vente IS NULL
      GROUP BY jour
      ORDER BY jour`,
      {
        replacements: { year, month },
        type: QueryTypes.SELECT,
      },
    );

    const depensesJournalieres = await sequelize.query(
      `SELECT 
        DAY(jour) as jour,
        SUM(total_depenses) as total_depenses
      FROM situation_detail_depense 
      WHERE annee = :year 
        AND mois = :month
        AND jour IS NOT NULL
        AND type_depense IS NULL
      GROUP BY jour
      ORDER BY jour`,
      {
        replacements: { year, month },
        type: QueryTypes.SELECT,
      },
    );

    const joursDansMois = new Date(year, month, 0).getDate();
    let ventesJourData = Array(joursDansMois).fill(0);
    let depensesJourData = Array(joursDansMois).fill(0);

    ventesJournalieres.forEach((v) => {
      if (v.jour >= 1 && v.jour <= joursDansMois) {
        ventesJourData[v.jour - 1] = parseFloat(v.total_ventes) || 0;
      }
    });

    depensesJournalieres.forEach((d) => {
      if (d.jour >= 1 && d.jour <= joursDansMois) {
        depensesJourData[d.jour - 1] = parseFloat(d.total_depenses) || 0;
      }
    });

    res.json({
      success: true,
      ventes: ventesJourData,
      depenses: depensesJourData,
      jours: Array.from({ length: joursDansMois }, (_, i) =>
        (i + 1).toString(),
      ),
    });
  } catch (err) {
    console.error("❌ Erreur récupération données journalières:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
