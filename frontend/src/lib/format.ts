import type { Enums } from './types';

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** « 5 000 FCFA » (espace insécable fine, chiffres tabulaires via la classe `montant`). */
export function fcfa(v: number | null | undefined): string {
	return `${nombre.format(Number(v ?? 0))} FCFA`;
}

export function entier(v: number | null | undefined): string {
	return nombre.format(Number(v ?? 0));
}

function versDate(v: string | Date | null | undefined): Date | null {
	if (!v) return null;
	const d = v instanceof Date ? v : new Date(v);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function date(v: string | Date | null | undefined): string {
	const d = versDate(v);
	return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

export function dateCourte(v: string | Date | null | undefined): string {
	const d = versDate(v);
	return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

export function dateHeure(v: string | Date | null | undefined): string {
	const d = versDate(v);
	return d
		? d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
		: '—';
}

/** « il y a 3 jours », « à l'instant »… */
export function relatif(v: string | Date | null | undefined): string {
	const d = versDate(v);
	if (!d) return '';
	const s = Math.round((Date.now() - d.getTime()) / 1000);
	if (s < 60) return "à l'instant";
	const unites: [number, Intl.RelativeTimeFormatUnit][] = [
		[60, 'minute'],
		[3600, 'hour'],
		[86400, 'day'],
		[604800, 'week'],
		[2629800, 'month'],
		[31557600, 'year']
	];
	const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
	for (let i = unites.length - 1; i >= 0; i--) {
		const [sec, unite] = unites[i];
		if (s >= sec) return rtf.format(-Math.floor(s / sec), unite);
	}
	return '';
}

/** Âge « X ans Y mois » (fonction legacy `age()`). */
export function age(naissance: string | null | undefined): string {
	const d = versDate(naissance);
	if (!d) return '';
	const now = new Date();
	let mois = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
	if (now.getDate() < d.getDate()) mois -= 1;
	return `${Math.floor(mois / 12)} ans ${mois % 12} mois`;
}

export function libelle(enums: Enums | undefined, nom: string, valeur: number | null | undefined): string {
	if (valeur === null || valeur === undefined) return '';
	return enums?.[nom]?.find((o) => o.value === valeur)?.label ?? '';
}

export function initiales(nom: string | null | undefined): string {
	return (nom ?? '')
		.split(/[\s-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((m) => m[0]?.toUpperCase())
		.join('');
}

/** Téléphone lisible : 065697797 → 06 569 77 97. */
export function telephone(t: string | null | undefined): string {
	const c = (t ?? '').replace(/\D/g, '');
	if (c.length !== 9) return t ?? '';
	return `${c.slice(0, 2)} ${c.slice(2, 5)} ${c.slice(5, 7)} ${c.slice(7)}`;
}

/** Lien WhatsApp pré-rempli (numéro congolais à 9 chiffres → indicatif 242, le 0 initial est conservé). */
export function lienWhatsApp(numero: string | null | undefined, message = ''): string {
	const c = (numero ?? '').replace(/\D/g, '');
	const international = c.length === 9 ? `242${c}` : c;
	return `https://wa.me/${international}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Lien de partage WhatsApp (sans destinataire). */
export function lienPartageWhatsApp(texte: string): string {
	return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}

/**
 * Balise JSON-LD sûre : `<` est échappé pour qu'un contenu saisi par un membre ne puisse pas
 * fermer la balise script (injection). À utiliser avec {@html jsonLd(objet)}.
 */
export function jsonLd(donnees: unknown): string {
	const barre = String.fromCharCode(92); // « \ » : on produit une séquence d'échappement JSON
	const json = JSON.stringify(donnees)
		.replaceAll('<', `${barre}u003c`)
		.replaceAll(String.fromCharCode(0x2028), `${barre}u2028`)
		.replaceAll(String.fromCharCode(0x2029), `${barre}u2029`);
	return `<script type="application/ld+json">${json}</script>`;
}

export function lienTel(numero: string | null | undefined): string {
	const c = (numero ?? '').replace(/\D/g, '');
	return `tel:${c.length === 9 ? `+242${c}` : c}`;
}

export function tronquer(texte: string | null | undefined, max = 160): string {
	const t = (texte ?? '').replace(/\s+/g, ' ').trim();
	return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function pourcentage(part: number, total: number): number {
	if (!total) return 0;
	return Math.max(0, Math.min(100, Math.round((100 * part) / total)));
}
