<script lang="ts">
	/** Grille des rubriques du pilier « Opportunités » (liens et descriptions de `PILIERS`). */
	import type { Component } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import House from '@lucide/svelte/icons/house';
	import Tag from '@lucide/svelte/icons/tag';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Scale from '@lucide/svelte/icons/scale';
	import Handshake from '@lucide/svelte/icons/handshake';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { LienNav } from '$lib/navigation';

	let { liens, compteurs = {} }: { liens: LienNav[]; compteurs?: Record<string, string | undefined> } = $props();

	const icones: Record<string, Component> = {
		'/marches': Landmark,
		'/emplois': Briefcase,
		'/immobilier': House,
		'/annonces': Tag,
		'/courses': ShoppingBag,
		'/entreprises': Building2,
		'/comparateur-prix': Scale,
		'/partenariats': Handshake
	};
	const teintes = ['bg-fleuve-50 text-fleuve-700', 'bg-laterite-50 text-laterite-700', 'bg-foret-50 text-foret-700', 'bg-soleil-100 text-encre'];
</script>

<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each liens as l, i (l.href)}
		{@const Icone = icones[l.href] ?? Sparkles}
		<li>
			<a href={l.href} class="carte group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-levee">
				<span class="grid size-12 place-items-center rounded-xl {teintes[i % teintes.length]}"><Icone class="size-6" aria-hidden="true" /></span>
				<span class="font-display text-lg font-bold text-fleuve-800">{l.label}</span>
				<span class="text-[15px] text-ardoise">{l.description}</span>
				<span class="mt-auto flex items-center justify-between gap-2 pt-1 text-sm font-semibold text-fleuve-700">
					<span>{compteurs[l.href] ?? ''}</span>
					<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
				</span>
			</a>
		</li>
	{/each}
</ul>
