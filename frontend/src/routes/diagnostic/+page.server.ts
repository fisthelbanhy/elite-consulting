import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { effacerReponses, ecrireReponses, lireReponses, premiereManquante, questionsDiagnostic } from '$lib/server/diagnostic';

async function questions(event: RequestEvent) {
	try {
		return await questionsDiagnostic(event);
	} catch {
		error(503, 'Le diagnostic est momentanément indisponible. Réessayez dans un instant ou écrivez-nous sur WhatsApp.');
	}
}

export const load: PageServerLoad = async (event) => {
	const qs = await questions(event);
	const reponses = lireReponses(event.cookies);
	const manquante = premiereManquante(qs, reponses);
	const demandee = Number(event.url.searchParams.get('etape'));
	// On ne saute pas une question : au plus la première sans réponse
	const plafond = manquante ?? qs.length;
	const etape = Math.min(Math.max(demandee || (Object.keys(reponses).length ? plafond : 1), 1), plafond);
	const question = qs[etape - 1];
	return {
		question,
		etape,
		total: qs.length,
		reponse: reponses[question.cle] ?? '',
		complet: manquante === null
	};
};

export const actions: Actions = {
	repondre: async (event) => {
		const qs = await questions(event);
		const fd = await event.request.formData();
		const etape = Math.min(Math.max(Number(fd.get('etape')) || 1, 1), qs.length);
		const question = qs[etape - 1];
		const valeur = String(fd.get(question.cle) ?? '');
		if (!question.options.some((o) => o.code === valeur)) {
			return fail(400, { message: 'Choisissez une réponse pour continuer.', champs: { [question.cle]: 'Choisissez une réponse.' } });
		}
		const reponses = { ...lireReponses(event.cookies), [question.cle]: valeur };
		ecrireReponses(event.cookies, reponses);
		const manquante = premiereManquante(qs, reponses);
		if (manquante === null) redirect(303, '/diagnostic/resultat');
		redirect(303, `/diagnostic?etape=${Math.min(etape + 1, manquante)}`);
	},
	recommencer: async (event) => {
		effacerReponses(event.cookies);
		redirect(303, '/diagnostic');
	}
};
