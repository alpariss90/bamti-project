const express = require('express');
const router = express.Router();
const enginController = require('../controllers/enginController');

// GET /engin/index
router.get('/index', enginController.list);

// POST /engin/createOrUpdate
router.post('/createOrUpdate', enginController.createOrUpdate);

// POST /engin/delete/:id
router.post('/delete/:id', enginController.delete);
router.get('/edit/:id', enginController.edit);


module.exports = router;
