import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * Hôtes acceptés par le serveur de développement. Vite ne répond qu'aux requêtes dont l'en-tête
 * `Host` lui est connu (protection contre le *DNS rebinding*) et renvoie sinon un 403 sec, sans
 * explication dans le navigateur. C'est ce qui arrive derrière un tunnel : le navigateur demande
 * `xxx.ngrok-free.dev`, que Vite ne connaît pas.
 *
 * Les domaines des tunnels courants sont donc déclarés ici — la notation `.domaine` couvre tous
 * les sous-domaines, ceux-ci étant tirés au hasard à chaque session. `LF_HOTES_AUTORISES`
 * (séparés par des virgules) permet d'en ajouter sans toucher au fichier.
 *
 * Cela ne concerne **que** le serveur de développement : en production, c'est `LF_SITE_URL` qui
 * fait foi, et le site n'est pas servi par Vite.
 */
const hotesAutorises = [
	'.ngrok-free.dev',
	'.ngrok-free.app',
	'.ngrok.io',
	'.trycloudflare.com',
	'.loca.lt',
	...(process.env.LF_HOTES_AUTORISES ?? '')
		.split(',')
		.map((h) => h.trim())
		.filter(Boolean)
];

export default defineConfig({
	server: { allowedHosts: hotesAutorises },
	preview: { allowedHosts: hotesAutorises },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
