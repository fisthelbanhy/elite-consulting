<script lang="ts">
	/**
	 * Grille de produits dans un seul formulaire d'ajout au panier (action `?/ajouter`) :
	 * ajout d'un produit (bouton de la carte) ou de toute la sélection en une fois (F-S5-13, F-S1-31).
	 */
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import CarteProduit from './CarteProduit.svelte';
	import type { ProduitResume } from '$lib/types/boutique';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string } | null | undefined;

	let {
		produits,
		distributeur = false,
		form,
		colonnes = 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
	}: {
		produits: { produit: ProduitResume; conseil?: string }[];
		distributeur?: boolean;
		form?: Retour;
		colonnes?: string;
	} = $props();

	let selection = $state(0);
	const retour = $derived(form?.cle === 'panier' ? form : null);
	const vendables = $derived(produits.filter((x) => x.produit.prix > 0 && x.produit.quantite_stock > 0).length);

	function recompter(e: Event) {
		const f = (e.currentTarget as HTMLElement).closest('form');
		if (!f) return;
		let n = 0;
		for (const [cle, v] of new FormData(f).entries()) if (cle.startsWith('quantite_')) n += Math.max(0, Number(v) || 0);
		selection = n;
	}
</script>

<Formulaire action="?/ajouter" {form} cle="panier" reinitialiser onsucces={() => (selection = 0)}>
	{#snippet children({ envoi })}
		<div oninput={recompter}>
			<ul class="grid gap-3 sm:gap-4 {colonnes}">
				{#each produits as x (x.produit.id)}
					<li><CarteProduit produit={x.produit} conseil={x.conseil} {distributeur} {envoi} /></li>
				{/each}
			</ul>
			{#if vendables > 1}
				<div
					class="sticky bottom-20 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-carte bg-white/95 p-3 shadow-levee ring-1 ring-fleuve-900/10 backdrop-blur lg:bottom-4"
				>
					<p class="text-[15px]" aria-live="polite">
						{#if selection > 0}<strong>{selection}</strong> article{selection > 1 ? 's' : ''} sélectionné{selection > 1 ? 's' : ''}
						{:else}Choisissez des quantités puis ajoutez toute la sélection en une fois.{/if}
					</p>
					<Bouton type="submit" chargement={envoi} disabled={selection === 0}>
						<ShoppingCart class="size-5" aria-hidden="true" />Ajouter la sélection au panier
					</Bouton>
				</div>
			{/if}
		</div>
		{#if retour?.succes}
			<div class="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md lg:bottom-6" role="status">
				<div class="flex items-center gap-3 rounded-xl bg-foret-700 p-4 text-white shadow-levee">
					<CircleCheck class="size-6 shrink-0" aria-hidden="true" />
					<p class="flex-1 font-semibold">{retour.succes}</p>
					<a href="/panier" class="rounded-lg bg-white px-3 py-2 font-semibold text-foret-700">Voir le panier</a>
				</div>
			</div>
		{/if}
	{/snippet}
</Formulaire>
