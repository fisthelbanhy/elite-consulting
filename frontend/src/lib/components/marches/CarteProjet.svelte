<script lang="ts">
	/** Carte d'un projet (F-S6-28) : référence, promoteur, objet, libellé, durée. */
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { dateCourte, tronquer } from '$lib/format';
	import type { ProjetResume } from '$lib/types/marches';

	let { projet: p }: { projet: ProjetResume } = $props();
</script>

<a href="/marches/projets/{p.id}" class="carte flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-levee">
	<div class="flex flex-wrap items-center gap-2">
		<Badge ton="foret">Projet</Badge>
		{#if p.etat !== 2}<BadgeEtat etat={p.etat} />{/if}
		<span class="text-xs text-ardoise">{p.reference}</span>
	</div>
	<h3 class="font-display text-lg leading-snug font-bold text-fleuve-800">{tronquer(p.libelle, 90)}</h3>
	<p class="text-[15px] text-encre/80">{tronquer(p.objet, 120)}</p>
	<p class="text-[15px] text-ardoise">Promoteur : <span class="font-semibold text-encre">{p.promoteur}</span></p>
	<p class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-ardoise">
		<span class="flex items-center gap-1"><CalendarClock class="size-4" aria-hidden="true" />{p.duree_mois ? `${p.duree_mois} mois` : 'Durée non précisée'}</span>
		{#if p.date_lancement}<span>Lancement le {dateCourte(p.date_lancement)}</span>{/if}
	</p>
</a>
