<script lang="ts">
	/** Témoignage dans une liste : citation du succès, portrait, pseudonyme et secteur. */
	import Quote from '@lucide/svelte/icons/quote';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { tronquer } from '$lib/format';
	import type { ReussiteResume } from '$lib/types/reussites';

	let { reussite: r, titre = 'h3' }: { reussite: ReussiteResume; titre?: 'h2' | 'h3' } = $props();
</script>

<a href="/reussites/{r.id}" class="carte group flex h-full flex-col p-6 transition-shadow hover:shadow-levee">
	<div class="flex items-start justify-between gap-3">
		<Quote class="size-8 shrink-0 text-soleil-400" aria-hidden="true" />
		{#if r.etat !== 2}<BadgeEtat etat={r.etat} libelles={{ 1: 'À valider', 3: 'Supprimée', 4: 'Retirée' }} />{/if}
	</div>
	<svelte:element this={titre} class="mt-3 font-display text-lg leading-snug font-bold text-fleuve-800">
		{tronquer(r.projet, 110)}
	</svelte:element>
	{#if r.succes}<p class="mt-2 flex-1 text-ardoise">« {tronquer(r.succes, 180)} »</p>{:else}<span class="flex-1"></span>{/if}
	<div class="mt-5 flex items-center gap-3">
		<Avatar src={r.auteur.photo_url} nom={r.auteur.pseudonyme} />
		<span class="min-w-0">
			<span class="block font-semibold text-encre">{r.auteur.pseudonyme}</span>
			{#if r.secteur}<span class="block truncate text-sm text-ardoise">{r.secteur}</span>{/if}
		</span>
		<span class="ml-auto text-sm font-semibold text-fleuve-700 group-hover:underline">Lire</span>
	</div>
</a>
