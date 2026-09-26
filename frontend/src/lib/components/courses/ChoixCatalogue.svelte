<script lang="ts">
	/** Articles du catalogue de la boutique choisie : seule la quantité est saisie (ADR-0007 S3c). */
	import Package from '@lucide/svelte/icons/package';
	import { fcfa } from '$lib/format';
	import type { ArticleCatalogue } from '$lib/types/courses';

	let { articles, quantites = $bindable() }: { articles: ArticleCatalogue[]; quantites: Record<string, number | string> } = $props();
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each articles as a (a.id)}
		{@const indisponible = a.disponible !== 1}
		<li class="flex gap-3 rounded-xl border border-fleuve-100 bg-white p-3 {indisponible ? 'opacity-60' : ''}">
			{#if a.photo_url}
				<img src={a.photo_url} alt="" loading="lazy" class="size-16 shrink-0 rounded-lg object-cover" />
			{:else}
				<span class="pagne grid size-16 shrink-0 place-items-center rounded-lg bg-sable text-fleuve-300" aria-hidden="true"><Package class="size-6" /></span>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="font-semibold leading-snug">{a.nom}</p>
				<p class="text-sm text-ardoise">{[a.marque, a.code].filter(Boolean).join(' · ')}</p>
				<p class="montant font-semibold text-laterite-700">{fcfa(a.prix)}</p>
				{#if indisponible}
					<p class="text-sm font-semibold text-alerte">Indisponible</p>
				{:else}
					<input type="hidden" name="catalogue_id" value={a.id} />
					<label class="mt-1 flex items-center gap-2 text-sm">
						<span>Quantité</span>
						<input name="catalogue_quantite" type="number" inputmode="numeric" min="0" max="999" bind:value={quantites[String(a.id)]} class="w-20 py-1.5" />
					</label>
				{/if}
			</div>
		</li>
	{/each}
</ul>
