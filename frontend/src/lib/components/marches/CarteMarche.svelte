<script lang="ts">
	/** Carte d'un appel d'offres (F-S6-24) : numéro, type, libellé, montant, maître d'ouvrage, échéance. */
	import Landmark from '@lucide/svelte/icons/landmark';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Echeance from './Echeance.svelte';
	import { fcfa, tronquer } from '$lib/format';
	import type { MarcheResume } from '$lib/types/marches';

	let { marche: m }: { marche: MarcheResume } = $props();
</script>

<a href="/marches/{m.id}" class="carte flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-levee {m.ouvert ? '' : 'opacity-80'}">
	<div class="flex flex-wrap items-center gap-2">
		<Badge ton={m.type_marche === 2 ? 'fleuve' : 'soleil'}>Marché {m.type_marche === 2 ? 'public' : 'privé'}</Badge>
		{#if m.etat !== 2 && m.etat !== 4}<BadgeEtat etat={m.etat} />{/if}
		<span class="text-xs text-ardoise">N° {m.numero_appel_offre}</span>
	</div>
	<h3 class="font-display text-lg leading-snug font-bold text-fleuve-800">{tronquer(m.libelle, 110)}</h3>
	{#if m.maitre_ouvrage}
		<p class="flex items-start gap-1.5 text-[15px] text-ardoise">
			<Landmark class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><span class="sr-only">Maître d'ouvrage : </span>{tronquer(m.maitre_ouvrage, 80)}</span>
		</p>
	{/if}
	<div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
		<p class="montant font-display text-xl font-bold text-laterite-700">{fcfa(m.montant)}</p>
		<Echeance jours={m.jours_restants} dateLimite={m.date_limite} etat={m.etat} />
	</div>
</a>
