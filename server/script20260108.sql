create view situation_general as 

select 
r1.total_vente, r4.montant_paiement, (r1.total_vente - r4.montant_paiement) as montant_credit,  r2.total_depense, r3.total_salaire
from
(
SELECT
1 as l, sum(v.montant) as total_vente
FROM
ventes v 
)r1 left join 
(SELECT
1 as l, sum(d.montant_depense) as total_depense
FROM
depenses d 
)r2 on r1.l=r2.l left join
(SELECT
1 as l, sum(s.montant_salaire + s.montant_credit + s.montant_gratification) as total_salaire
FROM
salaires s
)r3 on r1.l=r3.l  left JOIN
(select 1 as l, sum(p.montant) as montant_paiement from paiements p)r4 on r4.l=r1.l left JOIN
(select 1 as l, (count(vp.id) -1) as nbre_client from clients vp)r5 on r5.l=r1.l 












    --- script sauv vente 

SELECT 
    YEAR(date_vente) AS annee,
    MONTH(date_vente) AS mois,
    DATE(date_vente) AS jour,
    COUNT(*) AS nombre_ventes,
    SUM(montant) AS total_ventes
FROM ventes
GROUP BY YEAR(date_vente), MONTH(date_vente), DATE(date_vente) WITH ROLLUP
ORDER BY 
    COALESCE(annee, 9999) DESC, 
    COALESCE(mois, 99) DESC,
    COALESCE(jour, '9999-12-31') DESC;

-- Version plus lisible avec UNION ALL
SELECT 
    'journalier' AS type_periode,
    DATE(date_vente) AS periode,
    COUNT(*) AS nombre_ventes,
    SUM(montant) AS total_ventes
FROM ventes
WHERE date_vente >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(date_vente)

UNION ALL

SELECT 
    'mensuel' AS type_periode,
    DATE_FORMAT(date_vente, '%Y-%m') AS periode,
    COUNT(*) AS nombre_ventes,
    SUM(montant) AS total_ventes
FROM ventes
WHERE date_vente >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(date_vente, '%Y-%m')

UNION ALL

SELECT 
    'annuel' AS type_periode,
    YEAR(date_vente) AS periode,
    COUNT(*) AS nombre_ventes,
    SUM(montant) AS total_ventes
FROM ventes
GROUP BY YEAR(date_vente)

ORDER BY 
    FIELD(type_periode, 'journalier', 'mensuel', 'annuel'),
    periode DESC;

  --- fin script sauv vente 






create or replace view situation_detail_vente as 
SELECT 
    YEAR(date_vente) AS annee,
    MONTH(date_vente) AS mois,
    DATE(date_vente) AS jour,
    type_vente,
    COUNT(*) AS nombre_ventes,
    SUM(montant) AS total_ventes
FROM ventes
GROUP BY type_vente, YEAR(date_vente), MONTH(date_vente), DATE(date_vente) WITH ROLLUP
ORDER BY 
    COALESCE(annee, 9999) DESC, 
    COALESCE(mois, 99) DESC,
    COALESCE(jour, '9999-12-31') DESC;

    ou

    CREATE OR REPLACE VIEW situation_detail_vente AS
SELECT 
    YEAR(date_vente) AS annee,
    MONTH(date_vente) AS mois,
    DATE(date_vente) AS jour,
    type_vente,
    COUNT(*) AS nombre_ventes,
    SUM(montant) AS total_ventes
FROM ventes
GROUP BY 
    type_vente,
    YEAR(date_vente),
    MONTH(date_vente),
    DATE(date_vente)
WITH ROLLUP;








create view situation_detail_depense as
    SELECT 
    YEAR(date_depense) AS annee,
    MONTH(date_depense) AS mois,
    DATE(date_depense) AS jour,
    tp.libelle as type_depense,
    COUNT(*) AS nombre_depenses,
    SUM(montant_depense) AS total_depenses
FROM depenses d join type_depenses tp on tp.id=d.id_type_depense where isValid=true
GROUP BY tp.libelle, YEAR(date_depense), MONTH(date_depense), DATE(date_depense) WITH ROLLUP
ORDER BY 
    COALESCE(annee, 9999) DESC, 
    COALESCE(mois, 99) DESC,
    COALESCE(jour, '9999-12-31') DESC;
 ou
 CREATE OR REPLACE VIEW situation_detail_depense AS
SELECT 
    YEAR(d.date_depense) AS annee,
    MONTH(d.date_depense) AS mois,
    DATE(d.date_depense) AS jour,
    tp.libelle AS type_depense,
    COUNT(*) AS nombre_depenses,
    SUM(d.montant_depense) AS total_depenses
FROM depenses d
JOIN type_depenses tp ON tp.id = d.id_type_depense
WHERE d.isValid = TRUE
GROUP BY 
    tp.libelle,
    YEAR(d.date_depense),
    MONTH(d.date_depense),
    DATE(d.date_depense)
WITH ROLLUP;



    --- script sauv depense 
    SELECT 
    YEAR(date_depense) AS annee,
    MONTH(date_depense) AS mois,
    DATE(date_depense) AS jour,
    id_type_depense,
    COUNT(*) AS nombre_depenses,
    SUM(montant_depense) AS total_depenses
FROM depenses where isValid=true
GROUP BY id_type_depense, YEAR(date_depense), MONTH(date_depense), DATE(date_depense) WITH ROLLUP
ORDER BY 
    COALESCE(annee, 9999) DESC, 
    COALESCE(mois, 99) DESC,
    COALESCE(jour, '9999-12-31') DESC;

-- Version plus lisible avec UNION ALL
SELECT 
    'journalier' AS type_periode,
    DATE(date_depense) AS periode,
    id_type_depense,
    COUNT(*) AS nombre_depenses,
    SUM(montant_depense) AS total_depenses
FROM depenses 
WHERE date_depense >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) and isValid=true
GROUP BY id_type_depense, DATE(date_depense)

UNION ALL

SELECT 
    'mensuel' AS type_periode,
    DATE_FORMAT(date_depense, '%Y-%m') AS periode,
    id_type_depense,
    COUNT(*) AS nombre_depenses,
    SUM(montant_depense) AS total_depenses
FROM depenses
WHERE date_depense >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) and isValid=true
GROUP BY DATE_FORMAT(date_depense, '%Y-%m'), id_type_depense

UNION ALL

SELECT 
    'annuel' AS type_periode,
    YEAR(date_depense) AS periode,
    id_type_depense,
    COUNT(*) AS nombre_ven,
    SUM(montant_depense) AS total_depense
FROM depenses where isValid=true
GROUP BY id_type_depense, YEAR(date_depense)

ORDER BY 
    FIELD(type_periode, 'journalier', 'mensuel', 'annuel'),
    periode DESC;

-- fin script sauv depense



create or replace view situation_depense_vente_30 as
WITH RECURSIVE dates_table AS (
    SELECT CURDATE() as date_jour
    UNION ALL
    SELECT DATE_SUB(date_jour, INTERVAL 1 DAY)
    FROM dates_table
    WHERE date_jour > DATE_SUB(CURDATE(), INTERVAL 29 DAY)
)
SELECT 
    d.date_jour,
    DAY(d.date_jour) as jour,
    COALESCE(v.total_ventes, 0) as total_ventes,
    COALESCE(dep.total_depenses, 0) as total_depenses
FROM dates_table d
LEFT JOIN (
    -- Sous-requête pour les ventes
    SELECT 
        DATE(jour) as date_vente,
        SUM(total_ventes) as total_ventes
    FROM situation_detail_vente 
    WHERE jour >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND jour <= CURDATE()
    GROUP BY DATE(jour)
) v ON d.date_jour = v.date_vente
LEFT JOIN (
    -- Sous-requête pour les dépenses
    SELECT 
        DATE(jour) as date_depense,
        SUM(total_depenses) as total_depenses
    FROM situation_detail_depense 
    WHERE jour >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND jour <= CURDATE()
    GROUP BY DATE(jour)
) dep ON d.date_jour = dep.date_depense
ORDER BY d.date_jour;







create or replace view tendant_client_10 as WITH ventes_par_mois AS (
    SELECT 
        v.id_client,
        MONTH(v.createdAt) as mois,
        YEAR(v.createdAt) as annee,
        SUM(v.quantite * v.prix_unitaire) as total_mois
    FROM ventes v
    GROUP BY v.id_client, MONTH(v.createdAt), YEAR(v.createdAt)
),
dernier_mois AS (
    SELECT 
        id_client,
        mois,
        annee,
        total_mois as total_dernier_mois
    FROM ventes_par_mois
    WHERE (annee, mois) = (
        SELECT YEAR(CURDATE()), MONTH(CURDATE())
    )
),
avant_dernier_mois AS (
    SELECT 
        id_client,
        mois,
        annee,
        total_mois as total_avant_dernier_mois
    FROM ventes_par_mois
    WHERE (annee, mois) = (
        SELECT 
            YEAR(CURDATE() - INTERVAL 1 MONTH),
            MONTH(CURDATE() - INTERVAL 1 MONTH)
    )
)
SELECT 
    c.id,
    c.nom,
    c.prenom,
    COALESCE(dm.total_dernier_mois, 0) as total_mois_courant,
    COALESCE(adm.total_avant_dernier_mois, 0) as total_mois_precedent,
    CASE 
        WHEN COALESCE(adm.total_avant_dernier_mois, 0) = 0 THEN 'new'
        WHEN COALESCE(dm.total_dernier_mois, 0) > COALESCE(adm.total_avant_dernier_mois, 0) THEN 'up'
        WHEN COALESCE(dm.total_dernier_mois, 0) < COALESCE(adm.total_avant_dernier_mois, 0) THEN 'down'
        ELSE 'stable'
    END as tendance,
    (SELECT MAX(createdAt) FROM ventes WHERE id_client = c.id) as derniere_vente
FROM clients c
LEFT JOIN dernier_mois dm ON c.id = dm.id_client
LEFT JOIN avant_dernier_mois adm ON c.id = adm.id_client
ORDER BY COALESCE(dm.total_dernier_mois, 0) DESC
LIMIT 10;




create or replace view paiement_retard as
 select v.id, v.montant as montant_vente, p.id_vente, sum(coalesce(p.montant,0)) as montant_paye 
 FROM ventes v left join paiements p on p.id_vente=v.id 
 group by v.id, v.montant, p.id_vente 
 having sum(coalesce(p.montant,0)) <> v.montant;


    create table ventes_annuler as select * from ventes;
delete from ventes_annuler;