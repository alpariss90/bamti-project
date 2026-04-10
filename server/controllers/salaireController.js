const db = require("../models");

//  Fonction utilitaire de redirection avec message
function redirectWithMessage(req, res, msg, path = "/salaire/index") {
  req.flash("message", msg);
  return res.redirect(path);
}

exports.afficherSalaires = async (req, res) => {
  try {
    const mois = new Date().getMonth() + 1; //parseInt(req.query.mois) || new Date().getMonth() + 1; // mois actuel par défaut
    const annee = new Date().getFullYear(); //parseInt(req.query.annee) || new Date().getFullYear();  // année actuelle par défaut



// WHERE vs.mois=:m and vs.annee=:a
    // Requête SQL pour ce mois/année
 let result=[];
if(req.query.mois){
    [result] = await db.sequelize.query(
      `SELECT 
         *
       FROM vsalaires vs WHERE vs.mois=:m and vs.annee=:a; 
      `,
      {
        replacements: { m: req.query.mois, a: req.query.annee }
      }
    );
    }

    console.log(result);
    
    
/*
    const salaires = result.map(s => ({
      ...s,
      salaire_base: parseFloat(s.salaire_base ?? 0),
      total_credit: parseFloat(s.total_credit ?? 0),
      total_gratification: parseFloat(s.total_gratification ?? 0),
      montant_a_payer: parseFloat(s.montant_a_payer ?? s.salaire_base ?? 0)
    }));

    // Calcul des totaux
    const totaux = { salaire_base: 0, total_credit: 0, total_gratification: 0, montant_a_payer: 0 };
    salaires.forEach(s => {
      totaux.salaire_base += s.salaire_base;
      totaux.total_credit += s.total_credit;
      totaux.total_gratification += s.total_gratification;
      totaux.montant_a_payer += s.montant_a_payer;
    });*/

    res.render("salaire/index", {
      pageTitle: "Gestion des salaires",
      //salaires,
      selectedMois: mois,
      selectedAnnee: annee,
      message: null,
      salaires: result || []
      //totaux
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

exports.execute = async (req, res) => {
  const t = await db.sequelize.transaction();
console.log("1");

  try {
    const { mois, annee, btn_salaire } = req.body;

    if (!mois || mois === 0 || !annee || annee === 0) {
      await t.rollback();
      return res.status(400).send("Veuillez  sélectionné un mois et une année");
      //return redirectWithMessage(req, res, 'Veuillez  sélectionné un mois et une année');
    }

    if(btn_salaire!="execute"){
        return res.redirect("/salaire/index/?mois="+mois+"&annee="+annee);
    }


    console.log("2");
    const now = new Date();
    // Vérifier si le salaire existe pour ce mois/année
    const [exist] = await db.sequelize.query(
      `SELECT id FROM salaires 
         WHERE 
            mois = :mois
           AND annee = :annee`,
      { replacements: { mois, annee }, transaction: t }
    );
console.log("3");
    if (exist.length > 0) {
       console.log(
        "//////////////////////////////////"
      );
      await t.rollback();
      return res
        .status(400)
        .send("Le salaire pour ce mois et l'année a été déja effectuer");
    }

    const [exist1] = await db.sequelize.query(
      `select p.id from personnels p where p.etat=1 and p.id not in (select id_personnel from montant_personnel)`,
      { replacements: { mois, annee }, transaction: t }
    );

    if (exist1.length > 0) {
      await t.rollback();
      console.log(
        "---------------------------------------------------------------------------------"
      );

      return redirectWithMessage(
        req,
        res,
        "Il existe des personnels qui n'ont pas de saliare defini, vueillez definir le salaire de tout le personnel d'abord"
      );
      //return res.status(400).send("Il existe des personnels qui n'ont pas de saliare defin, vueillez definir le salaire de tout le personnel d'abord");
    }


console.log("+++++++++++++++++++++++++++++");

    await db.sequelize.query(
      `
          insert into salaires (id_personnel , mois, annee, montant_salaire, montant_credit, montant_gratification,createdAt, updatedAt)  
          SELECT
          p.id, :m as mois, :a as annee,  m.salaire, 0, 0, :c , :u 
          FROM
          personnels p join montant_personnel m on m.id_personnel=p.id where p.etat=1
      `,
      {
        replacements: {
          m: mois,
          a: annee,
          c: now,
          u: now
        },
        transaction: t,
      }
    );


    await db.sequelize.query(
      `
         update salaires s join vpersonnel_avance vp on vp.id_personnel=s.id_personnel set s.montant_credit=vp.montant where vp.type=:c and vp.mois=:m and vp.annee=:a
      `,
      {
        replacements: {
          c: 'credit', m : mois, a: annee
        },
        transaction: t,
      }
    );


    await db.sequelize.query(
      `
          update salaires s join vpersonnel_avance vp on vp.id_personnel=s.id_personnel set s.montant_gratification=vp.montant where vp.type=:c and vp.mois=:m and vp.annee=:a
      `,
      {
        replacements: {
          c: 'gratification', m : mois, a: annee
        },
        transaction: t,
      }
    );

    await t.commit();
    res.redirect(`/salaire/index/?mois=${mois}&annee=${annee}`);
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).send("Erreur lors de la validation des salaires.");
  }
};
