<script lang="ts">
	/** Carte « ACTIF / RECHERCHE / OBJECTIF » (legacy incl-choix5C.php, F-S5-46). */
	import Handshake from '@lucide/svelte/icons/handshake';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { relatif, tronquer } from '$lib/format';
	import type { PartenariatResume } from '$lib/types/partenariats';

	let { fiche: p }: { fiche: PartenariatResume } = $props();
</script>

<a href="/partenariats/{p.id}" class="carte flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-levee">
	<div class="flex flex-wrap items-center gap-2 text-xs text-ardoise">
		<Handshake class="size-4 text-foret-600" aria-hidden="true" />
		<span>{p.reference}</span>
		{#if p.etat !== 2}<BadgeEtat etat={p.etat} />{/if}
		<span class="ml-auto">{relatif(p.date_creation)}</span>
	</div>
	<dl class="space-y-2.5">
		<div>
			<dt class="text-xs font-bold tracking-wide text-foret-700 uppercase">J'ai (actif)</dt>
			<dd class="font-display text-lg leading-snug font-bold text-fleuve-800">{p.actif}</dd>
		</div>
		{#if p.recherche}
			<div>
				<dt class="text-xs font-bold tracking-wide text-laterite-700 uppercase">Je cherche</dt>
				<dd class="text-[15px]">{tronquer(p.recherche, 140)}</dd>
			</div>
		{/if}
		{#if p.objectif}
			<div>
				<dt class="text-xs font-bold tracking-wide text-fleuve-600 uppercase">Objectif</dt>
				<dd class="text-[15px] text-ardoise">{tronquer(p.objectif, 120)}</dd>
			</div>
		{/if}
	</dl>
	{#if p.auteur}<p class="mt-auto text-sm text-ardoise">Proposé par {p.auteur.pseudonyme}</p>{/if}
</a>
