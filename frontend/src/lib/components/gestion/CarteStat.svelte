<script lang="ts">
	/** Tuile chiffrée du tableau de bord ; mise en avant (ton « action ») quand il y a du travail en attente. */
	import type { Component } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let {
		libelle,
		valeur,
		detail,
		href,
		icone,
		action = false
	}: { libelle: string; valeur: string | number; detail?: string; href?: string; icone: Component; action?: boolean } = $props();

	const Icone = $derived(icone);
	const urgent = $derived(action && Number(valeur) > 0);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="carte group flex items-start gap-4 p-4 transition-shadow {href ? 'hover:shadow-levee' : ''} {urgent ? 'ring-2 ring-laterite-500/40' : ''}"
>
	<span class="grid size-11 shrink-0 place-items-center rounded-xl {urgent ? 'bg-laterite-50 text-laterite-700' : 'bg-fleuve-50 text-fleuve-700'}">
		<Icone class="size-6" aria-hidden="true" />
	</span>
	<span class="min-w-0 flex-1">
		<span class="block text-sm font-medium text-ardoise">{libelle}</span>
		<span class="montant block font-display text-2xl font-bold text-encre">{valeur}</span>
		{#if detail}<span class="block text-sm text-ardoise">{detail}</span>{/if}
	</span>
	{#if href}<ArrowRight class="mt-1 size-4 shrink-0 text-fleuve-300 group-hover:text-fleuve-700" aria-hidden="true" />{/if}
</svelte:element>
