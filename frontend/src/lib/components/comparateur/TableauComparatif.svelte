<script lang="ts">
	/** Tableau comparatif (F-S6-16) : entreprise, produit, unité, prix, volume mensuel,
	 * fournisseur/client, contact. Cartes sur mobile, tableau à partir de la largeur tablette. */
	import Badge from '$lib/components/ui/Badge.svelte';
	import Contacter from './Contacter.svelte';
	import { entier, fcfa } from '$lib/format';
	import type { LigneComparee } from '$lib/types/comparateur';

	let { lignes, legende }: { lignes: LigneComparee[]; legende: string } = $props();
	const type = (l: LigneComparee) => (l.offre_ou_demande === 1 ? 'Offre' : 'Demande');
</script>

<!-- Mobile : cartes -->
<ul class="space-y-3 md:hidden" aria-label={legende}>
	{#each lignes as l (l.id)}
		<li class="carte space-y-2 p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<Badge ton={l.offre_ou_demande === 1 ? 'foret' : 'soleil'}>{type(l)}</Badge>
					<p class="mt-1 font-display text-lg font-bold text-fleuve-800">{l.produit.nom}</p>
				</div>
				<p class="montant text-right font-display text-lg font-bold text-laterite-700">
					{fcfa(l.prix)}<span class="block text-sm font-normal text-ardoise">par {l.unite_vente}</span>
				</p>
			</div>
			<p class="text-[15px]">
				<a href="/entreprises/{l.entreprise.id}" class="lien">{l.entreprise.nom}</a>{#if l.entreprise.ville}<span class="text-ardoise"> · {l.entreprise.ville.nom}</span>{/if}
			</p>
			<p class="text-sm text-ardoise">
				{#if l.quantite_mensuelle}Volume : {entier(l.quantite_mensuelle)} {l.unite_vente} / mois{/if}
				{#if l.fournisseur_ou_client}{l.quantite_mensuelle ? ' · ' : ''}{l.fournisseur_ou_client}{/if}
			</p>
			<Contacter ligne={l} />
		</li>
	{/each}
</ul>

<!-- Tablette et ordinateur : tableau -->
<div class="carte hidden overflow-x-auto md:block">
	<table class="w-full text-left text-[15px]">
		<caption class="sr-only">{legende}</caption>
		<thead class="bg-sable/60 text-sm text-ardoise">
			<tr>
				<th scope="col" class="px-4 py-3 font-semibold">Entreprise</th>
				<th scope="col" class="px-4 py-3 font-semibold">Produit</th>
				<th scope="col" class="px-4 py-3 font-semibold">Unité</th>
				<th scope="col" class="px-4 py-3 text-right font-semibold">Prix</th>
				<th scope="col" class="px-4 py-3 text-right font-semibold">Volume mensuel</th>
				<th scope="col" class="px-4 py-3 font-semibold">Fournisseur / client</th>
				<th scope="col" class="px-4 py-3 font-semibold"><span class="sr-only">Contacter</span></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-fleuve-900/5">
			{#each lignes as l (l.id)}
				<tr class="align-top">
					<th scope="row" class="px-4 py-3 font-normal">
						<a href="/entreprises/{l.entreprise.id}" class="lien font-semibold">{l.entreprise.nom}</a>
						{#if l.entreprise.ville}<span class="block text-sm text-ardoise">{l.entreprise.ville.nom}</span>{/if}
					</th>
					<td class="px-4 py-3">
						<span class="font-semibold">{l.produit.nom}</span>
						<span class="mt-1 block"><Badge ton={l.offre_ou_demande === 1 ? 'foret' : 'soleil'}>{type(l)}</Badge></span>
					</td>
					<td class="px-4 py-3">{l.unite_vente}</td>
					<td class="montant px-4 py-3 text-right font-bold text-laterite-700">{fcfa(l.prix)}</td>
					<td class="montant px-4 py-3 text-right">{l.quantite_mensuelle ? entier(l.quantite_mensuelle) : '—'}</td>
					<td class="px-4 py-3 text-ardoise">{l.fournisseur_ou_client || '—'}</td>
					<td class="px-4 py-3"><Contacter ligne={l} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
