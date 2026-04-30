const express = require('express');
const router = express.Router();
const venteController = require('../controllers/venteController');

// Liste des ventes
router.get('/index', venteController.list);

// Créer ou mettre à jour une vente via POST (JSON)
router.post('/createOrUpdate', venteController.createOrUpdate);

router.post('/createOrUpdateCaissier', venteController.createOrUpdateCaissier);

// Supprimer une vente
router.delete('/delete/:id', venteController.delete);

// Ajouter un versement
router.post('/AjouterVersement', venteController.ajouterVersement);

// Voir tous les versements d’un client
router.get('/versements/:id_client', venteController.versementsClient);
router.get('/filtre', venteController.ventesFiltrees);


// Liste des redevable
router.get('/redevable', venteController.redevable);

// Liste des redevable
router.get('/redevable/print', venteController.redevableprint);

// Liste pour caissier
router.get('/index/caissier', venteController.caissier);


router.post('/annuler/:id', venteController.annuler);
router.get('/annulees', venteController.annulees);


module.exports = router;
