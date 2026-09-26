/**
 * Ajout au panier depuis le catalogue, une fiche produit ou une fiche bien-être.
 * Le formulaire porte un champ `quantite_{id}` par produit (ajout multiple, comme le legacy) ;
 * un bouton `seul={id}` n'ajoute que ce produit (au moins 1).
 */
import type { RequestEvent } from '@sveltejs/kit';
import { soumettre } from './api';
import type { Ok } from '$lib/types';

export async function ajouterAuPanier(event: RequestEvent) {
	const fd = await event.request.formData();
	const seul = Number(fd.get('seul') || 0);
	const lignes: { produit_id: number; quantite: number }[] = [];
	const valeurs: Record<string, unknown> = {};
	for (const [cle, brut] of fd.entries()) {
		const m = /^quantite_(\d+)$/.exec(cle);
		if (!m || typeof brut !== 'string') continue;
		const produit_id = Number(m[1]);
		const quantite = Math.max(0, Math.min(999, Math.trunc(Number(brut.replace(/\s/g, '')) || 0)));
		valeurs[cle] = quantite;
		if (seul && produit_id !== seul) continue;
		lignes.push({ produit_id, quantite: seul ? Math.max(1, quantite) : quantite });
	}
	if (seul && !lignes.length) lignes.push({ produit_id: seul, quantite: 1 });
	if (!lignes.length) lignes.push({ produit_id: 0, quantite: 0 });
	const r = await soumettre<Ok>(event, '/panier', { body: { lignes }, valeurs, cle: 'panier' });
	if (!r.ok) return r.echec;
	return { cle: 'panier', succes: r.data.message };
}
