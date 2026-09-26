<script lang="ts">
	/**
	 * Lignes du panier produits (F-S5-14, F-S1-33) : date, produit, prix figé, quantité « qté / stock »
	 * (en rouge si elle dépasse le stock), montant, modification et retrait (propriétaire seulement).
	 */
	import { enhance } from '$app/forms';
	import Package from '@lucide/svelte/icons/package';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { dateCourte, fcfa } from '$lib/format';
	import type { LignePanier } from '$lib/types/boutique';

	let { lignes }: { lignes: LignePanier[] } = $props();
</script>

<ul class="divide-y divide-fleuve-900/5">
	{#each lignes as li (li.id)}
		{@const p = li.produit}
		<li class="grid grid-cols-[4rem_1fr] gap-x-4 gap-y-3 py-4 sm:grid-cols-[4rem_1fr_auto]">
			<div class="size-16 overflow-hidden rounded-xl bg-sable">
				{#if p?.photo_url}
					<img src={p.photo_url} alt="" loading="lazy" width="64" height="64" class="size-full object-contain p-1" />
				{:else}
					<div class="grid size-full place-items-center text-fleuve-200"><Package class="size-7" aria-hidden="true" /></div>
				{/if}
			</div>
			<div class="min-w-0">
				{#if p}
					<a href="/boutique/{p.id}" class="font-semibold text-fleuve-800 hover:underline">{p.nom}</a>
				{:else}
					<span class="font-semibold">Produit retiré du catalogue</span>
				{/if}
				<p class="text-sm text-ardoise">
					Ajouté le {dateCourte(li.date_ajout)} · <span class="montant">{fcfa(li.prix_unitaire)}</span> l'unité
				</p>
				<p class="mt-1 text-sm {li.bloquante ? 'font-semibold text-alerte' : 'text-ardoise'}">
					Quantité {li.quantite} / stock {p?.quantite_stock ?? 0}
					{#if li.bloquante}— {p && p.etat === 2 ? 'stock insuffisant' : 'produit indisponible'}{/if}
				</p>
			</div>
			<div class="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
				<p class="montant text-lg font-bold">{fcfa(li.montant)}</p>
				<div class="flex items-center gap-2">
					<form method="POST" action="?/quantite" use:enhance class="flex items-center gap-1">
						<input type="hidden" name="ligne" value={li.id} />
						<label for="quantite-{li.id}" class="sr-only">Quantité de {p?.nom ?? 'ce produit'}</label>
						<input id="quantite-{li.id}" name="quantite" type="number" inputmode="numeric" min="0" max="999" value={li.quantite} class="w-20! text-center" />
						<button type="submit" class="grid size-12 place-items-center rounded-xl text-fleuve-700 ring-1 ring-fleuve-100 ring-inset hover:bg-fleuve-50">
							<RefreshCw class="size-4" aria-hidden="true" /><span class="sr-only">Mettre à jour la quantité</span>
						</button>
					</form>
					<form method="POST" action="?/retirer" use:enhance>
						<input type="hidden" name="ligne" value={li.id} />
						<button type="submit" class="inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 font-semibold text-alerte ring-1 ring-alerte/30 ring-inset hover:bg-alerte-50">
							<Trash2 class="size-4" aria-hidden="true" />Retirer<span class="sr-only"> {p?.nom ?? 'ce produit'}</span>
						</button>
					</form>
				</div>
			</div>
		</li>
	{/each}
</ul>
