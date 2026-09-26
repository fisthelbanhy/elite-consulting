/** Enregistrement du business plan : « Sauvegarder » (brouillon) ou « Envoyer » (soumis au conseiller). */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { lireFormulaire, soumettre } from './api';
import { CHAMPS_TEXTE } from '$lib/components/business-plan/questions';
import type { Ok } from '$lib/types';

export async function enregistrerBusinessPlan(event: RequestEvent, id?: number | null) {
	const fd = await event.request.formData();
	const spec = Object.fromEntries(CHAMPS_TEXTE.map((c) => [c, 'texte' as const]));
	const valeurs = lireFormulaire(fd, { ...spec, niveau_realisation: 'entier' });
	const niveau = Number(valeurs.niveau_realisation);
	valeurs.niveau_realisation = Number.isFinite(niveau) ? Math.max(0, Math.min(100, Math.trunc(niveau))) : 0;
	const envoyer = fd.get('action') === 'envoyer';
	const r = await soumettre<Ok>(event, id ? `/business-plan/${id}` : '/business-plan', {
		method: id ? 'PUT' : 'POST',
		body: { ...valeurs, envoyer },
		valeurs
	});
	if (!r.ok) return r.echec;
	redirect(303, `/business-plan?${envoyer ? 'envoye' : 'enregistre'}=1`);
}
