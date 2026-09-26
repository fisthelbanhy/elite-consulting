<script lang="ts">
	/** Carte de l'annuaire (F-S6-04) : nom + forme juridique, secteur, domaine, ville. */
	import { page } from '$app/state';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Eye from '@lucide/svelte/icons/eye';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import LogoEntreprise from './LogoEntreprise.svelte';
	import { libelle, tronquer } from '$lib/format';
	import type { EntrepriseResume } from '$lib/types/entreprises';

	let { entreprise: e }: { entreprise: EntrepriseResume } = $props();
	const forme = $derived(libelle(page.data.enums, 'FormeJuridique', e.forme_juridique));
</script>

<a href="/entreprises/{e.id}" class="carte flex h-full gap-4 p-5 transition-shadow hover:shadow-levee">
	<LogoEntreprise src={e.logo_url} nom={e.nom} />
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-2">
			{#if e.domaine?.secteur}<span class="text-xs font-semibold tracking-wide text-laterite-600 uppercase">{e.domaine.secteur.libelle}</span>{/if}
			{#if e.etat !== 2}<BadgeEtat etat={e.etat} />{/if}
		</div>
		<h3 class="mt-1 font-display text-lg leading-snug font-bold text-fleuve-800">
			{e.nom}{#if forme}<span class="font-sans text-[15px] font-semibold text-ardoise"> ({forme})</span>{/if}
		</h3>
		{#if e.domaine}<p class="text-[15px] text-ardoise">{e.domaine.libelle}</p>{/if}
		{#if e.description}<p class="mt-2 text-[15px] text-encre/80">{tronquer(e.description, 110)}</p>{/if}
		<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ardoise">
			{#if e.ville}<span class="flex items-center gap-1"><MapPin class="size-4" aria-hidden="true" />{e.ville.nom}</span>{/if}
			<span class="flex items-center gap-1"><Eye class="size-4" aria-hidden="true" />{e.nombre_visites}<span class="sr-only"> consultations</span></span>
			<span class="text-xs">{e.reference}</span>
		</div>
	</div>
</a>
