const express = require('express');
const router = express.Router();
const mdpController = require('../controllers/mdpController');
// const  isAdmin  = require('../middleware/sessionUser');


router.get('/change-password', mdpController.changePassword);
 router.post('/valide-change-password', mdpController.valideChangePassword);


module.exports = router;
