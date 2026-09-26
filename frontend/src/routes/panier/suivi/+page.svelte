<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateCourte, fcfa, telephone } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const l = $derived(data.liste);
	// Abréviations du legacy (F-S1-40) : N.P., P.N.C., P.C.
	const etats = {
		1: { court: 'N.P.', long: 'Non payé', ton: 'neutre' },
		2: { court: 'P.N.C.', long: 'Paiement non confirmé', ton: 'soleil' },
		3: { court: 'P.C.', long: 'Paiement confirmé', ton: 'foret' }
	} as const;
</script>

<svelte:head>
	<title>Paniers des membres — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Paniers produits des membres"
	sousTitre="Toutes les lignes de panier de la boutique, avec leur état de paiement. La confirmation des paiements se fait dans la caisse."
	fil={[{ href: '/boutique', label: 'Boutique' }, { href: '/panier/suivi', label: 'Suivi des paniers' }]}
/>

<div class="conteneur space-y-6 py-8">
	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Membre ou produit</label>
			<input id="q" name="q" type="search" value={f.q} />
		</div>
		<div>
			<label for="etat_paiement" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat_paiement" name="etat_paiement">
				<option value="">Tous</option>
				{#each [1, 2, 3] as e (e)}<option value={e} selected={f.etat_paiement === String(e)}>{etats[e as 1 | 2 | 3].long}</option>{/each}
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	{#if l.items.length}
		<p class="text-ardoise" aria-live="polite">{l.total} ligne{l.total > 1 ? 's' : ''} pour un total de <strong class="montant text-encre">{fcfa(l.somme)}</strong></p>
		<div class="carte overflow-x-auto">
			<table class="w-full min-w-[46rem] text-left text-[15px]">
				<thead class="bg-sable text-sm text-ardoise">
					<tr>
						<th scope="col" class="px-4 py-3">Date</th>
						<th scope="col" class="px-4 py-3">Membre</th>
						<th scope="col" class="px-4 py-3">Produit</th>
						<th scope="col" class="px-4 py-3 text-right">Prix</th>
						<th scope="col" class="px-4 py-3 text-right">Qté</th>
						<th scope="col" class="px-4 py-3 text-right">Montant</th>
						<th scope="col" class="px-4 py-3">État</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-fleuve-900/5">
					{#each l.items as li (li.id)}
						{@const e = etats[li.etat_paiement] ?? etats[1]}
						<tr>
							<td class="px-4 py-3 whitespace-nowrap">{dateCourte(li.date_ajout)}</td>
							<td class="px-4 py-3">
								{#if li.membre}
									<span class="font-semibold">{li.membre.nom}</span>
									<span class="block text-sm text-ardoise">{li.membre.pseudonyme}{#if li.membre.telephone} · {telephone(li.membre.telephone)}{/if}</span>
								{/if}
							</td>
							<td class="px-4 py-3">{li.produit?.nom ?? 'Produit retiré'}</td>
							<td class="montant px-4 py-3 text-right">{fcfa(li.prix_unitaire)}</td>
							<td class="px-4 py-3 text-right">{li.quantite}</td>
							<td class="montant px-4 py-3 text-right font-semibold">{fcfa(li.montant)}</td>
							<td class="px-4 py-3"><Badge ton={e.ton}><abbr title={e.long} class="no-underline">{e.court}</abbr></Badge></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide titre="Aucune ligne de panier" texte="Aucune commande ne correspond à ces critères." />
	{/if}
</div>
