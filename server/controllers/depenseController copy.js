const db = require("../models");
const { Op } = require("sequelize");
const Depense = db.Depense;
const TypeDepense = db.TypeDepense;
const Engin = db.Engin;

// Affichage de la page dépenses + liste
exports.list = async (req, res) => {
  try {
    const depenses = await Depense.findAll({
      include: [
        { model: TypeDepense, as: "typeDepense", attributes: ["libelle"] },
        { model: Engin, as: "engin", attributes: ["libelle"], required: false }, // nullable
      ],
    });

    const types = await TypeDepense.findAll();
    const engins = await Engin.findAll();

    res.render("depenses/index", {
      depenses,
      types,
      engins,
      message: req.flash("message")[0] || null,
      pageTitle: "Gestion des Dépenses",
    });
  } catch (err) {
    console.error("Erreur lors du chargement des dépenses :", err);
    req.flash("message", {
      text: "Erreur serveur lors du chargement des dépenses.",
      type: "danger",
    });
    res.redirect("/depenses/index");
  }
};

// Affichage des depenses non valides
exports.depensesNonValide = async (req, res) => {
  try {
    const depenses = await Depense.findAll({
      where: {
        isvalid: {
          [Op.ne]: true, // Op.ne = "not equal" (différent de)
        },
      },
      include: [
        { model: TypeDepense, as: "typeDepense", attributes: ["libelle"] },
        { model: Engin, as: "engin", attributes: ["libelle"], required: false },
      ],
    });

    res.render("depenses/non_valide", {
      depenses,
      message: req.flash("message")[0] || null,
      pageTitle: "Gestion des Dépenses non validées",
    });
  } catch (err) {
    console.error("Erreur lors du chargement des dépenses :", err);
    req.flash("message", {
      text: "Erreur serveur lors du chargement des dépenses.",
      type: "danger",
    });
    res.redirect("/depenses/index");
  }
};

// Fonction utilitaire pour rediriger avec message
function redirectWithMessage(
  req,
  res,
  msg,
  type = "success",
  path = "/depenses/index"
) {
  req.flash("message", { text: msg, type });
  return res.redirect(path);
}

// Créer ou mettre à jour une dépense
exports.createOrUpdate = async (req, res) => {
  const {
    id,
    id_type_depense,
    id_engin,
    date_depense,
    montant_depense,
    observation,
  } = req.body;

  const createdBy = req.session?.user?.login;

  if (!id_type_depense || !date_depense || !montant_depense) {
    return redirectWithMessage(
      req,
      res,
      "Veuillez remplir les champs obligatoires.",
      "danger"
    );
  }

  try {
    if (id) {
      // Mise à jour
      const depense = await Depense.findByPk(id);
      if (!depense)
        return redirectWithMessage(req, res, "Dépense introuvable.", "danger");

      if (depense.valide) {
        return redirectWithMessage(
          req,
          res,
          "Dépense validée, modification impossible.",
          "warning"
        );
      }

      await depense.update({
        id_type_depense,
        id_engin: id_engin || null,
        date_depense,
        montant_depense,
        observation,
      });

      return redirectWithMessage(
        req,
        res,
        "Dépense mise à jour avec succès.",
        "warning"
      );
    } else {
      // Création
      await Depense.create({
        id_type_depense,
        id_engin: id_engin || null,
        date_depense,
        montant_depense,
        observation,
        createdBy,
        valide: false,
      });

      return redirectWithMessage(
        req,
        res,
        "Dépense ajoutée avec succès.",
        "success"
      );
    }
  } catch (err) {
    console.error("Erreur lors de la création/mise à jour :", err);
    return redirectWithMessage(
      req,
      res,
      "Erreur lors de la création ou modification de la dépense.",
      "danger"
    );
  }
};

// Supprimer une dépense (physique)
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const depense = await Depense.findByPk(id);
    if (!depense)
      return redirectWithMessage(req, res, "Dépense introuvable.", "danger");

    if (depense.valide) {
      return redirectWithMessage(
        req,
        res,
        "Dépense validée, suppression impossible.",
        "warning"
      );
    }

    await depense.destroy();
    return redirectWithMessage(
      req,
      res,
      "Dépense supprimée avec succès.",
      "success"
    );
  } catch (err) {
    console.error("Erreur lors de la suppression de la dépense :", err);
    return redirectWithMessage(
      req,
      res,
      "Erreur lors de la suppression de la dépense.",
      "danger"
    );
  }
};

// Valider une dépense
exports.validate = async (req, res) => {
  const { id } = req.params;
  try {
    const depense = await Depense.findByPk(id);
    if (!depense)
      return redirectWithMessage(req, res, "Dépense introuvable.", "danger");

    await depense.update({ isValid: true });
    return redirectWithMessage(
      req,
      res,
      "Dépense validée, modification/suppression bloquée.",
      "success"
    );
  } catch (err) {
    console.error("Erreur lors de la validation de la dépense :", err);
    return redirectWithMessage(
      req,
      res,
      "Erreur lors de la validation de la dépense.",
      "danger"
    );
  }
};

function convertToISO(dateFR) {
  const [jour, mois, annee] = dateFR.split("/");
  return `${annee}-${mois}-${jour}`; // Format MySQL
}
// ==============================
//  FILTRAGE DES DÉPENSES
// ==============================
exports.depensesFiltrees = async (req, res) => {
  try {
    date_debut = req.query.date_debut || new Date().toLocaleDateString("fr-FR");

    date_fin = req.query.date_fin || new Date().toLocaleDateString("fr-FR");

    id_type_depense = req.query.id_type_depense || "tous";

    id_engin = req.query.id_engin || "tous";

    // Construire la clause WHERE
    const whereClause = {
      date_depense: {
        [Op.between]: [
          new Date(convertToISO(date_debut)),
          new Date(convertToISO(date_fin)),
        ],
      },
      isValid: true,
    };

    if (id_type_depense && id_type_depense !== "tous")
      whereClause.id_type_depense = id_type_depense;
    if (id_engin && id_engin !== "tous") whereClause.id_engin = id_engin;

    // Charger les dépenses avec leurs associations
    const depenses = await Depense.findAll({
      where: whereClause,
      include: [
        { model: TypeDepense, as: "typeDepense", attributes: ["libelle"] },
        { model: Engin, as: "engin", attributes: ["libelle"], required: false },
      ],
      order: [["date_depense", "DESC"]],
    });

    // Regrouper par Type de Dépense (et Engin si tu veux)
    const depensesRegroupees = {};

    depenses.forEach((dep) => {
      const key = `${dep.typeDepense?.libelle || "Inconnu"}-${
        dep.engin?.libelle || "Aucun"
      }`;
      if (!depensesRegroupees[key]) {
        depensesRegroupees[key] = {
          typeDepense: dep.typeDepense?.libelle || "Inconnu",
          engin: dep.engin?.libelle || "Aucun",
          montantTotal: 0,
          depenses: [],
        };
      }

      depensesRegroupees[key].montantTotal += dep.montant_depense;
      depensesRegroupees[key].depenses.push(dep);
    });

    // Convertir en tableau
    const depensesAggregees = Object.values(depensesRegroupees);

    // Totaux globaux
    const montantTotalGlobal = depensesAggregees.reduce(
      (s, d) => s + d.montantTotal,
      0
    );

    // Récupérer données pour le filtre
    const types = await TypeDepense.findAll();
    const engins = await Engin.findAll();

    // Rendu de la page
    res.render("depenses/filtre", {
      types,
      engins,
      depenses: depensesAggregees,
      montantTotalGlobal,
      id_type_depense: id_type_depense || "",
      id_engin: id_engin || "",
      date_debut: date_debut || "",
      date_fin: date_fin || "",
      pageTitle: `Dépenses filtrées du ${date_debut || "..."} au ${
        date_fin || "..."
      }`,
      message: req.flash("message")[0] || null,
    });
  } catch (err) {
    console.error("Erreur filtrage dépenses:", err);
    redirectWithMessage(
      req,
      res,
      "Erreur lors du filtrage des depenses.",
      "danger"
    );
  }
};
