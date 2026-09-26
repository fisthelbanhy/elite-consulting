<script lang="ts">
	/**
	 * Histogramme des 30 derniers jours : visites anonymes (barres) et connexions de membres
	 * (barres plus fines). Un tableau de données reste disponible pour les lecteurs d'écran.
	 */
	import type { PointSerie } from '$lib/types/gestion';

	let { serie }: { serie: PointSerie[] } = $props();

	const max = $derived(Math.max(1, ...serie.map((p) => Math.max(p.visites, p.connexions))));
	const largeur = 600;
	const hauteur = 140;
	const pas = $derived(largeur / Math.max(1, serie.length));
	const jourCourt = (j: string) => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
</script>

<figure>
	<svg viewBox="0 0 {largeur} {hauteur + 20}" class="h-44 w-full" role="img" aria-label="Visites et connexions des 30 derniers jours">
		<line x1="0" x2={largeur} y1={hauteur} y2={hauteur} class="stroke-fleuve-100" stroke-width="1" />
		{#each serie as p, i (p.jour)}
			{@const hv = (p.visites / max) * (hauteur - 8)}
			{@const hc = (p.connexions / max) * (hauteur - 8)}
			<g>
				<title>{jourCourt(p.jour)} : {p.visites} visite{p.visites > 1 ? 's' : ''}, {p.connexions} connexion{p.connexions > 1 ? 's' : ''}</title>
				<rect x={i * pas + pas * 0.12} y={hauteur - hv} width={pas * 0.5} height={hv} rx="2" class="fill-fleuve-500" />
				<rect x={i * pas + pas * 0.64} y={hauteur - hc} width={pas * 0.24} height={hc} rx="1.5" class="fill-laterite-500" />
			</g>
			{#if i % 7 === 0 || i === serie.length - 1}
				<text x={i * pas + pas / 2} y={hauteur + 15} text-anchor="middle" class="fill-ardoise text-[11px]">{jourCourt(p.jour)}</text>
			{/if}
		{/each}
	</svg>
	<figcaption class="mt-2 flex flex-wrap gap-4 text-sm text-ardoise">
		<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-fleuve-500" aria-hidden="true"></span>Visites anonymes</span>
		<span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-laterite-500" aria-hidden="true"></span>Connexions de membres</span>
	</figcaption>
</figure>
<details class="mt-2 text-sm">
	<summary class="cursor-pointer text-fleuve-700">Voir les données</summary>
	<table class="mt-2 w-full max-w-sm text-left">
		<thead><tr class="text-ardoise"><th class="py-1 font-medium">Jour</th><th class="font-medium">Visites</th><th class="font-medium">Connexions</th></tr></thead>
		<tbody>
			{#each serie as p (p.jour)}
				<tr class="border-t border-fleuve-900/5"><td class="py-1">{jourCourt(p.jour)}</td><td class="montant">{p.visites}</td><td class="montant">{p.connexions}</td></tr>
			{/each}
		</tbody>
	</table>
</details>
