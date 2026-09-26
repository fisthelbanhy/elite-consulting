<script lang="ts">
	/** Recherche du comparateur : produit, offre/demande, mots, tri par prix (formulaire GET). */
	import Search from '@lucide/svelte/icons/search';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { Produit } from '$lib/types/comparateur';

	let {
		produits,
		filtres
	}: {
		produits: Produit[];
		filtres: { type: string; produit_id: string; q: string; entreprise_id: string; tri: string };
	} = $props();

	const soumettre = (e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit();
	const compte = (p: Produit) => {
		const n = [p.offres ? `${p.offres} offre${p.offres > 1 ? 's' : ''}` : '', p.demandes ? `${p.demandes} demande${p.demandes > 1 ? 's' : ''}` : '']
			.filter(Boolean)
			.join(', ');
		return n ? `${p.nom} (${n})` : p.nom;
	};
</script>

<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:items-end" data-sveltekit-keepfocus>
	{#if filtres.entreprise_id}<input type="hidden" name="entreprise_id" value={filtres.entreprise_id} />{/if}
	<div class="sm:col-span-2 lg:col-span-1">
		<label for="produit_id" class="mb-1.5 block text-[15px] font-semibold">Produit</label>
		<select id="produit_id" name="produit_id" onchange={soumettre}>
			<option value="">Tous les produits</option>
			{#each produits as p (p.id)}<option value={p.id} selected={String(p.id) === filtres.produit_id}>{compte(p)}</option>{/each}
		</select>
	</div>
	<div>
		<label for="type" class="mb-1.5 block text-[15px] font-semibold">Je cherche</label>
		<select id="type" name="type" onchange={soumettre}>
			<option value="">Offres et demandes</option>
			<option value="1" selected={filtres.type === '1'}>Des fournisseurs (offres)</option>
			<option value="2" selected={filtres.type === '2'}>Des clients (demandes)</option>
		</select>
	</div>
	<div>
		<label for="q" class="mb-1.5 block text-[15px] font-semibold">Mots</label>
		<div class="relative">
			<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
			<input id="q" name="q" type="search" value={filtres.q} placeholder="Produit, entreprise…" class="pl-10" maxlength="100" />
		</div>
	</div>
	<div>
		<label for="tri" class="mb-1.5 block text-[15px] font-semibold">Trier par</label>
		<select id="tri" name="tri" onchange={soumettre}>
			<option value="">Prix croissant</option>
			<option value="prix_desc" selected={filtres.tri === 'prix_desc'}>Prix décroissant</option>
			<option value="recent" selected={filtres.tri === 'recent'}>Plus récents</option>
		</select>
	</div>
	<Bouton type="submit" variante="fleuve">Comparer</Bouton>
</form>
