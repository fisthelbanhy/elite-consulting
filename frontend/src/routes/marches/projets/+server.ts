import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** La liste des projets est l'onglet « Projets » de /marches : cette URL stable sert aux liens
 * et au retour après suppression (qui ajoute `?supprime=1`). */
export const GET: RequestHandler = ({ url }) => {
	const suite = new URLSearchParams(url.searchParams);
	suite.set('onglet', 'projets');
	redirect(301, `/marches?${suite}`);
};
