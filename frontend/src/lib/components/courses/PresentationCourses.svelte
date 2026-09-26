<script lang="ts">
	/** Présentation du service de courses : étapes, tarifs paramétrés, conditions et boutiques partenaires. */
	import { page } from '$app/state';
	import Bike from '@lucide/svelte/icons/bike';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ShoppingBasket from '@lucide/svelte/icons/shopping-basket';
	import Store from '@lucide/svelte/icons/store';
	import { fcfa } from '$lib/format';
	import type { Boutique } from '$lib/types/courses';

	let { boutiques = [], compact = false }: { boutiques?: Boutique[]; compact?: boolean } = $props();
	const p = $derived(page.data.parametres);
	const etapes = [
		{ icone: ClipboardList, titre: 'Vous faites votre liste', texte: 'Article, quantité et prix maxi à ne pas dépasser — ou choix au catalogue d’une boutique partenaire.' },
		{ icone: ShoppingBasket, titre: 'On fait vos achats', texte: 'Au marché, au magasin ou chez la boutique choisie, à la date que vous fixez.' },
		{ icone: Bike, titre: 'On vous livre', texte: 'À l’adresse et à l’heure indiquées, entre 10 h et 18 h 30.' }
	];
</script>

<section class="space-y-6" aria-labelledby="titre-service">
	{#if !compact}
		<h2 id="titre-service" class="text-2xl font-bold">Comment ça marche ?</h2>
		<ol class="grid gap-4 md:grid-cols-3">
			{#each etapes as e, i (e.titre)}
				<li class="carte p-5">
					<span class="grid size-12 place-items-center rounded-full bg-fleuve-50 text-fleuve-700"><e.icone class="size-6" aria-hidden="true" /></span>
					<h3 class="mt-3 text-lg font-bold">{i + 1}. {e.titre}</h3>
					<p class="mt-1 text-[15px] text-ardoise">{e.texte}</p>
				</li>
			{/each}
		</ol>
	{:else}
		<h2 id="titre-service" class="sr-only">Le service de courses</h2>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<div class="carte p-5">
			<h3 class="text-lg font-bold">Tarifs</h3>
			<dl class="mt-2 space-y-1 text-[15px]">
				<div class="flex justify-between gap-4"><dt>Montant minimum des courses</dt><dd class="montant font-semibold">{fcfa(p?.montant_minimum_course)}</dd></div>
				<div class="flex justify-between gap-4"><dt>Frais de service par course</dt><dd class="montant font-semibold">{fcfa(p?.commission_course)}</dd></div>
			</dl>
			<p class="mt-2 text-sm text-ardoise">Vous payez les achats + les frais, par Mobile Money, en espèces ou par Charden Farell.</p>
		</div>
		{#if p?.conditions_course}
			<div class="carte p-5">
				<h3 class="text-lg font-bold">Conditions des courses</h3>
				<p class="mt-2 text-[15px] whitespace-pre-line text-ardoise">{p.conditions_course}</p>
			</div>
		{/if}
	</div>

	{#if boutiques.length && !compact}
		<div>
			<h3 class="mb-3 text-lg font-bold">Nos boutiques partenaires</h3>
			<ul class="flex flex-wrap gap-2">
				{#each boutiques as b (b.id)}
					<li class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[15px] ring-1 ring-fleuve-100">
						<Store class="size-4 text-fleuve-600" aria-hidden="true" />{b.pseudonyme}
						{#if b.nombre_articles}<span class="text-sm text-ardoise">· {b.nombre_articles} article{b.nombre_articles > 1 ? 's' : ''}</span>{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
