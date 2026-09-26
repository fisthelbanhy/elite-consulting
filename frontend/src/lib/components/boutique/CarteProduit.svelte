<script lang="ts">
	/**
	 * Carte produit du catalogue, à placer dans un formulaire d'ajout au panier : champ
	 * `quantite_{id}` (ajout multiple) + bouton « Ajouter » (`seul={id}`, ajout de ce seul produit).
	 */
	import { page } from '$app/state';
	import Package from '@lucide/svelte/icons/package';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Prix from './Prix.svelte';
	import SelecteurQuantite from './SelecteurQuantite.svelte';
	import EtatStock from './EtatStock.svelte';
	import { lienWhatsApp, tronquer } from '$lib/format';
	import type { ProduitResume } from '$lib/types/boutique';

	let {
		produit: p,
		distributeur = false,
		conseil,
		envoi = false
	}: { produit: ProduitResume; distributeur?: boolean; conseil?: string; envoi?: boolean } = $props();

	const vendable = $derived(p.prix > 0 && p.quantite_stock > 0);
	const wa = $derived(page.data.parametres?.whatsapp as string | undefined);
</script>

<article class="carte flex h-full flex-col overflow-hidden">
	<a href="/boutique/{p.id}" class="group block">
		<div class="aspect-square bg-sable">
			{#if p.photo_url}
				<img
					src={p.photo_url}
					alt=""
					loading="lazy"
					decoding="async"
					width="400"
					height="400"
					class="size-full object-contain p-3 transition-transform group-hover:scale-105"
				/>
			{:else}
				<div class="grid size-full place-items-center text-fleuve-200"><Package class="size-14" aria-hidden="true" /></div>
			{/if}
		</div>
		<div class="px-4 pt-3">
			<h3 class="font-display text-base leading-snug font-bold text-fleuve-800 group-hover:underline sm:text-lg">{p.nom}</h3>
			{#if p.reference}<p class="text-xs text-ardoise">Réf. {p.reference}</p>{/if}
		</div>
	</a>
	<div class="flex flex-1 flex-col gap-3 px-4 pt-2 pb-4">
		{#if conseil}
			<div class="rounded-lg bg-foret-50 p-3 text-sm">
				<p class="font-semibold text-foret-700">Conseil d'utilisation</p>
				<p class="mt-0.5 whitespace-pre-line">{conseil}</p>
			</div>
		{:else if p.description}
			<p class="hidden text-sm text-ardoise sm:block">{tronquer(p.description, 90)}</p>
		{/if}
		<Prix prix={p.prix} prixPublic={p.prix_public} prixDistributeur={p.prix_distributeur} {distributeur} />
		<EtatStock stock={p.quantite_stock} />
		<div class="mt-auto">
			{#if vendable}
				<div class="flex flex-wrap items-center gap-2">
					<SelecteurQuantite name="quantite_{p.id}" label="Quantité de {p.nom}" max={Math.min(999, p.quantite_stock)} />
					<button
						type="submit"
						name="seul"
						value={p.id}
						disabled={envoi}
						class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-fleuve-700 px-3 font-semibold text-white hover:bg-fleuve-800 disabled:opacity-60"
					>
						<ShoppingCart class="size-5" aria-hidden="true" />Ajouter<span class="sr-only"> {p.nom} au panier</span>
					</button>
				</div>
			{:else if wa}
				<a
					href={lienWhatsApp(wa, `Bonjour la Frangine, je suis intéressé·e par le produit « ${p.nom} » (réf. ${p.reference}). Est-il disponible ?`)}
					target="_blank"
					rel="noopener"
					class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-3 font-semibold text-foret-700 ring-1 ring-foret-600/40 ring-inset hover:bg-foret-50"
				>
					<MessageCircle class="size-5" aria-hidden="true" />{p.prix > 0 ? 'Me prévenir' : 'Demander le prix'}
				</a>
			{/if}
		</div>
	</div>
</article>
