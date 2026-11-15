// Chargé avant chaque fichier de test : config/db.js passe alors sur la base bamti_test.
process.env.NODE_ENV = 'test';
process.env.RAPPORT_ACTIF = 'false'; // jamais d'envoi de mail pendant les tests
