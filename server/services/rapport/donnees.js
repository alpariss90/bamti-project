// Collecte des chiffres d'un rapport (ventes, encaissements, dépenses, stock de sachets)
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');
const { listeJours, formatFR } = require('./periode');

function requete(sql, replacements) {
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

const num = (v) => Number(v) || 0;

async function collecterDonnees({ debut, fin }) {
  const p = { debut, fin };

  const [
    ventesTotal,
    ventesParType,
    ventesParPaiement,
    encaissements,
    restePeriode,
    creancesTotales,
    depensesParType,
    stock,
    ventesParJour,
    encaissementsParJour,
    depensesParJour
  ] = await Promise.all([
    requete(`
      SELECT COUNT(*) AS nb, COALESCE(SUM(quantite), 0) AS qte, COALESCE(SUM(montant), 0) AS montant
      FROM ventes WHERE date_vente BETWEEN :debut AND :fin`, p),

    requete(`
      SELECT type_vente AS type, COUNT(*) AS nb, COALESCE(SUM(quantite), 0) AS qte, COALESCE(SUM(montant), 0) AS montant
      FROM ventes WHERE date_vente BETWEEN :debut AND :fin
      GROUP BY type_vente ORDER BY type_vente`, p),

    requete(`
      SELECT type_paiement AS type, COUNT(*) AS nb, COALESCE(SUM(montant), 0) AS montant
      FROM ventes WHERE date_vente BETWEEN :debut AND :fin
      GROUP BY type_paiement ORDER BY type_paiement`, p),

    // Encaissements réels = paiements reçus pendant la période,
    // séparés entre ventes de la période et recouvrements de ventes antérieures
    requete(`
      SELECT COALESCE(SUM(p.montant), 0) AS total,
             COALESCE(SUM(CASE WHEN v.date_vente >= :debut THEN p.montant ELSE 0 END), 0) AS sur_periode,
             COALESCE(SUM(CASE WHEN v.date_vente <  :debut THEN p.montant ELSE 0 END), 0) AS recouvrement
      FROM paiements p JOIN ventes v ON v.id = p.id_vente
      WHERE p.date BETWEEN :debut AND :fin`, p),

    // Reste à encaisser (à la fin de la période) sur les ventes de la période
    requete(`
      SELECT COALESCE(SUM(GREATEST(v.montant - COALESCE(pp.paye, 0), 0)), 0) AS reste
      FROM ventes v
      LEFT JOIN (SELECT id_vente, SUM(montant) AS paye FROM paiements WHERE date <= :fin GROUP BY id_vente) pp
        ON pp.id_vente = v.id
      WHERE v.date_vente BETWEEN :debut AND :fin AND v.type_paiement <> 'total'`, p),

    // Total des créances clients à la fin de la période (toutes ventes confondues)
    requete(`
      SELECT COALESCE(SUM(GREATEST(v.montant - COALESCE(pp.paye, 0), 0)), 0) AS reste
      FROM ventes v
      LEFT JOIN (SELECT id_vente, SUM(montant) AS paye FROM paiements WHERE date <= :fin GROUP BY id_vente) pp
        ON pp.id_vente = v.id
      WHERE v.date_vente <= :fin AND v.type_paiement <> 'total'`, p),

    // Dépenses validées uniquement
    requete(`
      SELECT tp.libelle AS type, COUNT(*) AS nb, COALESCE(SUM(d.montant_depense), 0) AS montant
      FROM depenses d JOIN type_depenses tp ON tp.id = d.id_type_depense
      WHERE d.isValid = 1 AND d.date_depense BETWEEN :debut AND :fin
      GROUP BY tp.libelle ORDER BY montant DESC`, p),

    requete(`
      SELECT
        (SELECT COALESCE(SUM(quantite), 0) FROM stock_sachet_entrees WHERE date_production < :debut) AS entrees_avant,
        (SELECT COALESCE(SUM(quantite), 0) FROM stock_sachet_sorties WHERE date_sortie < :debut) AS sorties_avant,
        (SELECT COALESCE(SUM(quantite), 0) FROM stock_sachet_entrees WHERE date_production BETWEEN :debut AND :fin) AS entrees,
        (SELECT COALESCE(SUM(quantite), 0) FROM stock_sachet_sorties WHERE date_sortie BETWEEN :debut AND :fin) AS sorties`, p),

    requete(`
      SELECT date_vente AS jour, COUNT(*) AS nb, COALESCE(SUM(quantite), 0) AS qte, COALESCE(SUM(montant), 0) AS montant
      FROM ventes WHERE date_vente BETWEEN :debut AND :fin GROUP BY date_vente`, p),

    requete(`
      SELECT date AS jour, COALESCE(SUM(montant), 0) AS montant
      FROM paiements WHERE date BETWEEN :debut AND :fin GROUP BY date`, p),

    requete(`
      SELECT date_depense AS jour, COALESCE(SUM(montant_depense), 0) AS montant
      FROM depenses WHERE isValid = 1 AND date_depense BETWEEN :debut AND :fin GROUP BY date_depense`, p)
  ]);

  const v = ventesTotal[0];
  const e = encaissements[0];
  const s = stock[0];
  const totalDepenses = depensesParType.reduce((t, d) => t + num(d.montant), 0);
  const stockInitial = num(s.entrees_avant) - num(s.sorties_avant);

  // Index par jour pour le détail (les dates peuvent revenir en Date ou en chaîne selon le driver)
  const cle = (j) => (j instanceof Date ? j.toISOString() : String(j)).slice(0, 10);
  const indexer = (lignes) => Object.fromEntries(lignes.map(l => [cle(l.jour), l]));
  const vj = indexer(ventesParJour);
  const ej = indexer(encaissementsParJour);
  const dj = indexer(depensesParJour);

  const jours = listeJours(debut, fin).map(jour => {
    const ventes = num(vj[jour]?.montant);
    const encaisse = num(ej[jour]?.montant);
    const depenses = num(dj[jour]?.montant);
    return {
      date: formatFR(jour),
      nb_ventes: num(vj[jour]?.nb),
      qte: num(vj[jour]?.qte),
      ventes,
      encaissements: encaisse,
      depenses,
      solde_caisse: encaisse - depenses
    };
  });

  return {
    ventes: {
      nb: num(v.nb),
      qte: num(v.qte),
      montant: num(v.montant),
      parType: ventesParType.map(r => ({ type: r.type, nb: num(r.nb), qte: num(r.qte), montant: num(r.montant) })),
      parPaiement: ventesParPaiement.map(r => ({ type: r.type, nb: num(r.nb), montant: num(r.montant) }))
    },
    encaissements: {
      total: num(e.total),
      surPeriode: num(e.sur_periode),
      recouvrement: num(e.recouvrement),
      restePeriode: num(restePeriode[0].reste),
      creancesTotales: num(creancesTotales[0].reste)
    },
    depenses: {
      nb: depensesParType.reduce((t, d) => t + num(d.nb), 0),
      total: totalDepenses,
      parType: depensesParType.map(r => ({ type: r.type, nb: num(r.nb), montant: num(r.montant) }))
    },
    stock: {
      initial: stockInitial,
      entrees: num(s.entrees),
      sorties: num(s.sorties),
      final: stockInitial + num(s.entrees) - num(s.sorties)
    },
    jours
  };
}

module.exports = { collecterDonnees };
