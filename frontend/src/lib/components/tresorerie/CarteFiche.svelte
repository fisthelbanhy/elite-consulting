<script lang="ts">
	/** Carte de liste d'une fiche de trésorerie (placement, opération, crédit, contentieux). */
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { ETATS_TRESORERIE } from '$lib/types/tresorerie';

	let {
		href,
		reference,
		titre,
		montant,
		etat,
		details = [],
		membre = null,
		date = ''
	}: {
		href: string;
		reference: string;
		titre: string;
		montant?: string;
		etat: number;
		details?: [string, string][];
		membre?: string | null;
		date?: string;
	} = $props();
</script>

<a {href} class="carte group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-levee">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<span class="text-xs font-semibold tracking-wide text-ardoise">{reference}{#if date}&nbsp;· {date}{/if}</span>
		<BadgeEtat {etat} libelles={ETATS_TRESORERIE} />
	</div>
	<div class="flex items-start justify-between gap-3">
		<h3 class="font-display text-lg leading-snug font-bold text-fleuve-800">{titre}</h3>
		{#if montant}<p class="montant shrink-0 text-lg font-bold text-encre">{montant}</p>{/if}
	</div>
	{#if details.length}
		<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
			{#each details as [l, v] (l)}
				<div class="min-w-0"><dt class="text-ardoise">{l}</dt><dd class="truncate font-semibold">{v || '—'}</dd></div>
			{/each}
		</dl>
	{/if}
	<div class="mt-auto flex items-center justify-between gap-2 text-sm">
		<span class="text-ardoise">{#if membre}Membre : <strong class="text-encre">{membre}</strong>{/if}</span>
		<span class="inline-flex items-center font-semibold text-fleuve-700 group-hover:underline">Voir<ChevronRight class="size-4" aria-hidden="true" /></span>
	</div>
</a>
