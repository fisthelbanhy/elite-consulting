<script lang="ts">
	/**
	 * Articles de petites annonces présents dans le panier (type 2, module Annonces) : affichés ici
	 * pour que le badge du panier et son contenu concordent ; paiement séparé (type 2).
	 */
	import { enhance } from '$app/forms';
	import Tag from '@lucide/svelte/icons/tag';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { fcfa } from '$lib/format';
	import type { Panier } from '$lib/types/annonces';

	let { panier }: { panier: Panier } = $props();
</script>

<section class="carte p-5 sm:p-6" aria-labelledby="titre-articles">
	<h2 id="titre-articles" class="flex items-center gap-2 text-xl font-bold"><Tag class="size-5 text-fleuve-600" aria-hidden="true" />Petites annonces</h2>
	<p class="mt-1 text-[15px] text-ardoise">Articles de membres, réglés séparément des produits Forever.</p>
	<ul class="mt-3 divide-y divide-fleuve-900/5">
		{#each panier.lignes as li (li.id)}
			<li class="flex flex-wrap items-center justify-between gap-3 py-3">
				<div class="min-w-0">
					{#if li.article}
						<a href="/annonces/{li.article.id}" class="font-semibold text-fleuve-800 hover:underline">{li.article.libelle}</a>
					{:else}
						<span class="font-semibold">Article retiré</span>
					{/if}
					<p class="text-sm {li.stock_insuffisant ? 'font-semibold text-alerte' : 'text-ardoise'}">
						{li.quantite} × <span class="montant">{fcfa(li.prix_unitaire)}</span>{#if li.stock_insuffisant} — stock insuffisant{/if}
					</p>
				</div>
				<div class="flex items-center gap-3">
					<span class="montant font-bold">{fcfa(li.montant)}</span>
					<form method="POST" action="?/retirerArticle" use:enhance>
						<input type="hidden" name="ligne" value={li.id} />
						<button type="submit" class="grid size-12 place-items-center rounded-xl text-alerte ring-1 ring-alerte/30 ring-inset hover:bg-alerte-50">
							<Trash2 class="size-4" aria-hidden="true" /><span class="sr-only">Retirer {li.article?.libelle ?? 'cet article'}</span>
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
	<div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-fleuve-900/5 pt-4">
		<p>Total articles : <strong class="montant">{fcfa(panier.total_montant)}</strong></p>
		{#if panier.peut_payer}
			<Bouton href="/paiement/2" variante="fleuve">Payer les articles</Bouton>
		{:else if panier.message}
			<p class="text-sm font-semibold text-alerte">{panier.message}</p>
		{/if}
	</div>
</section>
