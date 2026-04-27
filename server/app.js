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

const sessionUser = require('./middleware/sessionUser');
const authRole = require('./middleware/authRole');

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

// ── Routes API Mobile (JWT — sans session, sans authRole) ───────────────────
app.use('/api/mobile/auth', mobileAuthRoutes);
app.use('/api/mobile',      mobileDataRoutes);

app.use('/login', loginRoutes);
app.use('/', authRole('admin', 'caissier', 'visualisation', 'magasinier'), indexRouter);
app.use('/dashboard', authRole('admin', 'caissier', 'visualisation'), dashboardRoutes);
app.use('/users', authRole('admin'), usersRouter); 
app.use('/personnes', authRole('admin'), clientsRouter);
app.use('/person', authRole('admin'), personnelsRouter);
app.use('/commandes',authRole('admin'), commandesRouter);

app.use('/type_depense', authRole('admin'), typeDepenseRoutes);
app.use('/depenses', authRole('admin'), depenseRoutes);
app.use('/engin', authRole('admin'), enginRoutes);
app.use('/ventes', authRole('admin', 'caissier'), venteRoutes);
app.use('/montant_personnel', authRole('admin'), montantPersonnelRoutes);
app.use('/personnel_avance', authRole('admin'), personnelAvanceRoutes);
app.use('/salaire', authRole('admin'), salaireRoutes);
app.use('/mvt_matieres', authRole('admin', 'magasinier'), mvtMatiereRoutes);
app.use('/tickets', authRole('admin', 'caissier'), ticketRouter);
app.use('/revendeurs', authRole('admin'), revendeurRouter);
app.use('/mdp', authRole('admin', 'caissier', 'visualisation'), mdpRoutes);
app.use('/backup', authRole('admin'), backupRouter);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  next(createError(404));
});*/

app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

module.exports = app;
