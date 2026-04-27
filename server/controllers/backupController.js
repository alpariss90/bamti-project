const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const isWindows = process.platform === 'win32';

const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'));
fs.mkdir(backupDir, { recursive: true }).catch(console.error);

// POST /backup/create
exports.create = async (req, res) => {
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fileName = `sauv_${pad(now.getDate())}_${pad(now.getMonth() + 1)}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}.sql`;
    const filePath = path.join(backupDir, fileName);

    const { DB_HOST = 'localhost', DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    if (!DB_USER || !DB_NAME) {
      return redirectWithMessage(req, res, 'Variables DB_USER / DB_NAME manquantes dans .env.');
    }

    const passwordArg = DB_PASSWORD ? `-p${DB_PASSWORD}` : '';

    // Sur Windows exec utilise cmd.exe, sur Linux/Mac il utilise /bin/sh
    // Les deux supportent la redirection > mais les guillemets diffèrent
    const quotedPath = isWindows ? `"${filePath}"` : `'${filePath}'`;
    const cmd = `mysqldump -h ${DB_HOST} -u ${DB_USER} ${passwordArg} ${DB_NAME} > ${quotedPath}`;

    await execPromise(cmd, { shell: isWindows ? 'cmd.exe' : '/bin/sh' });
    redirectWithMessage(req, res, `Sauvegarde créée avec succès : ${fileName}`);
  } catch (err) {
    console.error('[Backup] create :', err);
    const hint = err.message.includes('not found') || err.message.includes('introuvable')
      ? ' (vérifiez que mysqldump est dans le PATH du système)'
      : '';
    redirectWithMessage(req, res, `Erreur lors de la sauvegarde : ${err.message}${hint}`);
  }
};

// GET /backup/liste
exports.liste = async (req, res) => {
  try {
    const files = await fs.readdir(backupDir);
    const backups = files
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => b.localeCompare(a));

    res.render('backups', {
      backups,
      message: req.flash('message')[0] || null,
      error: null,
      warning: null,
      pageTitle: 'Gestion des sauvegardes'
    });
  } catch (err) {
    console.error('[Backup] liste :', err);
    res.render('backups', {
      backups: [],
      message: null,
      error: [`Impossible de lire le dossier de sauvegardes : ${err.message}`],
      warning: null,
      pageTitle: 'Gestion des sauvegardes'
    });
  }
};

// GET /backup/download/:filename
exports.download = async (req, res) => {
  const { filename } = req.params;
  const safePath = path.join(backupDir, path.basename(filename));

  try {
    await fs.access(safePath);
    res.download(safePath, filename);
  } catch {
    res.status(404).send('Fichier non trouvé.');
  }
};

function redirectWithMessage(req, res, msg, redirectPath = '/backup/liste') {
  req.flash('message', msg);
  return res.redirect(redirectPath);
}
