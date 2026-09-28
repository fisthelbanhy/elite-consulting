import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Chaque fichier de test s'exécute dans son propre processus, donc sur sa propre base
		// SQLite en mémoire : les tests ne peuvent pas se polluer entre eux.
		isolate: true,
		env: {
			LF_ENVIRONNEMENT: 'test',
			LF_DATABASE_URL: 'sqlite:///:memory:',
			// Les fichiers téléversés pendant les tests restent hors du dossier de production.
			LF_MEDIA_DIR: '.tmp-tests/media'
			// Les limites de connexion gardent leurs valeurs réelles : les tests les vérifient.
		},
		include: ['tests/**/*.test.ts']
	}
});
