<script lang="ts">
	/** « Mes fiches » d'un module : total, dernières fiches avec leur statut, liens utiles. */
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { dateCourte } from '$lib/format';
	import type { ModuleEspace } from '$lib/types/espace';

	let { module: m }: { module: ModuleEspace } = $props();
	const ton = (s: string) =>
		s === 'En attente' || s === 'Brouillon' ? 'soleil' : s === 'Publié' || s === 'Soumis' || s === 'Livrée' ? 'foret' : 'neutre';
</script>

<article class="carte flex h-full flex-col p-5">
	<header class="flex items-baseline justify-between gap-2">
		<h3 class="text-lg font-bold">{m.libelle}</h3>
		<span class="montant rounded-full bg-fleuve-50 px-2.5 py-0.5 text-sm font-bold text-fleuve-700">{m.total}</span>
	</header>
	<ul class="mt-3 flex-1 divide-y divide-fleuve-900/5">
		{#each m.fiches as f (`${f.lien}-${f.id}`)}
			<li>
				<a href={f.lien} class="flex items-start justify-between gap-3 py-2.5 hover:text-fleuve-700">
					<span class="min-w-0">
						<span class="block truncate font-medium">{f.titre}</span>
						{#if f.date}<span class="block text-sm text-ardoise">{dateCourte(f.date)}{f.reference ? ` · ${f.reference}` : ''}</span>{/if}
					</span>
					{#if f.statut}<Badge ton={ton(f.statut)}>{f.statut}</Badge>{/if}
				</a>
			</li>
		{/each}
	</ul>
	<footer class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
		<a href={m.lien_liste} class="lien inline-flex items-center gap-1">Voir la rubrique<ArrowRight class="size-4" aria-hidden="true" /></a>
		{#if m.lien_nouveau}<a href={m.lien_nouveau} class="lien inline-flex items-center gap-1"><Plus class="size-4" aria-hidden="true" />Publier</a>{/if}
	</footer>
</article>
