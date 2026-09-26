<script lang="ts">
	/** Sommaire des référentiels (legacy : menu « FICHIERS » du gestionnaire). */
	import type { Component } from 'svelte';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import IconeCarte from '@lucide/svelte/icons/map';
	import Factory from '@lucide/svelte/icons/factory';
	import Layers from '@lucide/svelte/icons/layers';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Tags from '@lucide/svelte/icons/tags';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import Package from '@lucide/svelte/icons/package';
	import Scale from '@lucide/svelte/icons/scale';
	import Landmark from '@lucide/svelte/icons/landmark';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import { REFERENTIELS } from '$lib/components/gestion/referentiels';

	let { data } = $props();
	const icones: Record<string, Component> = {
		villes: MapPin,
		quartiers: IconeCarte,
		secteurs: Factory,
		domaines: Layers,
		diplomes: GraduationCap,
		familles: Tags,
		maladies: HeartPulse,
		produits: Package,
		'produits-comparateur': Scale,
		banques: Landmark
	};
	const descriptions: Record<string, string> = {
		maladies: 'Besoins bien-être et produits conseillés, avec leur conseil d’utilisation.',
		produits: 'Catalogue Forever Living : groupes, 3 niveaux de prix, stock, photos.'
	};
</script>

<svelte:head>
	<title>Référentiels — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Référentiels" sousTitre="Les listes de référence utilisées partout sur le site." fil={[{ href: '/gestion/referentiels', label: 'Référentiels' }]} />

<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
	<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.sommaire as r (r.cle)}
			{@const Icone = icones[r.cle] ?? Layers}
			<li>
				<a href="/gestion/referentiels/{r.cle}" class="carte flex h-full items-start gap-4 p-4 transition-shadow hover:shadow-levee">
					<span class="grid size-11 shrink-0 place-items-center rounded-xl bg-fleuve-50 text-fleuve-700"><Icone class="size-6" aria-hidden="true" /></span>
					<span class="min-w-0">
						<span class="block font-display text-lg font-bold text-fleuve-800">{r.libelle}</span>
						<span class="block text-sm text-ardoise">{REFERENTIELS[r.cle]?.description ?? descriptions[r.cle] ?? ''}</span>
						<span class="montant mt-1 block text-sm font-semibold">{r.total} élément{r.total > 1 ? 's' : ''} actif{r.total > 1 ? 's' : ''}</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
</div>
