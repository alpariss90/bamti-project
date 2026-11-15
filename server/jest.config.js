// Tests automatiques du serveur : npm test (voir tests/LISEZMOI.md)
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  maxWorkers: 1,        // une seule base de test partagée : les fichiers passent l'un après l'autre
  testTimeout: 30000,
};
