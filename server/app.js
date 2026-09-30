require('dotenv').config(); // 🌱 Charger les variables d'environnement
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// ── API Mobile : routes JWT ───────────────────────────────────────────────────
const mobileAuthRoutes = require('./routes/api/auth');
const mobileDataRoutes = require('./routes/api/mobile');

// 🔗 Import des modèles et initialisation Sequelize
require('./models'); // <--- Cela lance la synchro automatiquement

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var clientsRouter = require('./routes/clients');
const personnelsRouter = require('./routes/personnels');
const enginRoutes = require('./routes/engin');
const profilRoutes = require('./routes/profil');
const congeRoutes = require('./routes/conge');
const planificationRoutes = require('./routes/planification');
const materielRoutes = require('./routes/materiel');
const factureRoutes = require('./routes/facture');
const stockSachetRoutes = require('./routes/stockSachet');
const typeDepenseRoutes = require('./routes/type_depense');
const venteRoutes = require('./routes/vente');
const montantPersonnelRoutes = require('./routes/montant_personnel');
const personnelAvanceRoutes = require('./routes/avance_personnel');
const salaireRoutes = require('./routes/salaire');
const dashboardRoutes = require('./routes/dashboard');
const depenseRoutes = require('./routes/depense');
const mdpRoutes = require('./routes/mdp');
const loginRoutes = require('./routes/login');
const mvtMatiereRoutes = require('./routes/mvt_matiere');
const commandesRouter = require('./routes/commande');
const ticketRouter = require('./routes/ticket');
const revendeurRouter = require('./routes/revendeur');
const backupRouter = require('./routes/backup');
const reservationRouter = require('./routes/reservation');
const rapportRouter = require('./routes/rapport');
const logRouter = require('./routes/log');

const sessionUser = require('./middleware/sessionUser');
// Droits par profil : voir config/permissions.js
const { autorise } = require('./middleware/autorise');

var app = express();

// ── CORS : autoriser l'app mobile (Ionic / Capacitor) ───────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const session = require('express-session');

app.use(session({
  secret:'default_secret_key', 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true seulement si HTTPS
}));

const flash = require('connect-flash');
app.use(flash());
app.use(sessionUser);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Rendre les messages flash disponibles dans toutes les vues EJS
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.warning = req.flash('warning');
  next();
});

// ── Routes API Mobile (JWT — sans session, sans contrôle de profil) ───────────────────
app.use('/api/mobile/auth', mobileAuthRoutes);
app.use('/api/mobile',      mobileDataRoutes);

app.use('/login', loginRoutes);
app.use('/', autorise('accueil'), indexRouter);
app.use('/dashboard', autorise('dashboard'), dashboardRoutes);
app.use('/users', autorise('users'), usersRouter);
app.use('/personnes', autorise('personnes'), clientsRouter);
app.use('/person', autorise('personnel'), personnelsRouter);
app.use('/commandes', autorise('commandes'), commandesRouter);

app.use('/type_depense', autorise('type_depense'), typeDepenseRoutes);
app.use('/depenses', autorise('depenses'), depenseRoutes);
app.use('/engin', autorise('engin'), enginRoutes);
app.use('/profil', autorise('profil'), profilRoutes);
app.use('/conge', autorise('conge'), congeRoutes);
app.use('/planification', autorise('planification'), planificationRoutes);
app.use('/ventes', autorise('ventes'), venteRoutes);
app.use('/montant_personnel', autorise('montant_personnel'), montantPersonnelRoutes);
app.use('/personnel_avance', autorise('personnel_avance'), personnelAvanceRoutes);
app.use('/salaire', autorise('salaire'), salaireRoutes);
app.use('/mvt_matieres', autorise('mvt_matieres'), mvtMatiereRoutes);
app.use('/materiel', autorise('materiel'), materielRoutes);
app.use('/facture', autorise('facture'), factureRoutes);
app.use('/stock-sachet', autorise('stock_sachet'), stockSachetRoutes);
app.use('/tickets', autorise('tickets'), ticketRouter);
app.use('/revendeurs', autorise('revendeurs'), revendeurRouter);
app.use('/mdp', autorise('mdp'), mdpRoutes);
app.use('/backup', autorise('backup'), backupRouter);
app.use('/reservations', autorise('reservations'), reservationRouter);
app.use('/rapports', autorise('rapports'), rapportRouter);
app.use('/logs', autorise('logs'), logRouter);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  next(createError(404));
});*/

app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

module.exports = app;
