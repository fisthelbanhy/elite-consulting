<script lang="ts">
	/** Recherche et filtre d'état d'une liste (filtres conservés dans l'URL, F-TR-02). */
	import type { Snippet } from 'svelte';
	import Search from '@lucide/svelte/icons/search';
	import Bouton from '$lib/components/ui/Bouton.svelte';

	let {
		q = '',
		etat = '',
		etats,
		placeholder = 'Référence, mot-clé…',
		children
	}: {
		q?: string;
		etat?: string;
		/** Libellés des états proposés (gestionnaires) ; sans eux, pas de filtre d'état. */
		etats?: Record<number, string>;
		placeholder?: string;
		children?: Snippet;
	} = $props();
</script>

<form method="GET" class="carte mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end" data-sveltekit-keepfocus>
	<div>
		<label for="filtre-q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
		<div class="relative">
			<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
			<input id="filtre-q" name="q" type="search" value={q} {placeholder} class="pl-10" />
		</div>
	</div>
	{#if etats}
		<div>
			<label for="filtre-etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="filtre-etat" name="etat">
				<option value="">Tous (hors annulés)</option>
				{#each Object.entries(etats) as [v, l] (v)}<option value={v} selected={v === etat}>{l}</option>{/each}
			</select>
		</div>
	{/if}
	{@render children?.()}
	<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
</form>
