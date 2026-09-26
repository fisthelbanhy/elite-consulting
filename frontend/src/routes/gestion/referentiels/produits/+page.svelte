<script lang="ts">
	/** Catalogue produits (F-ADM-25 à F-ADM-27) : filtres groupe, prix maximums, stock, texte. */
	import { enhance } from '$app/forms';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Package from '@lucide/svelte/icons/package';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import TaillePage from '$lib/components/gestion/TaillePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { entier, libelle } from '$lib/format';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const groupes = $derived(data.enums.GroupeProduit ?? []);
	const nombre = (v: number) => entier(v);
</script>

<svelte:head>
	<title>Produits — Référentiels — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion
	titre="Produits"
	sousTitre="{data.liste.total} produit{data.liste.total > 1 ? 's' : ''} au catalogue Forever Living."
	fil={[{ href: '/gestion/referentiels', label: 'Référentiels' }, { href: '/gestion/referentiels/produits', label: 'Produits' }]}
>
	<Bouton href="/gestion/referentiels/produits/nouveau" taille="sm"><Plus class="size-4" aria-hidden="true" />Nouveau produit</Bouton>
</EnTeteGestion>

<div class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
	{#if data.enregistre}<Alerte type="succes" titre={data.enregistre === 'cree' ? 'Enregistrement effectué.' : 'Modification effectuée.'} />{/if}
	{#if form?.succes}<Alerte type="succes" titre={form.succes} />{:else if form?.message}<Alerte type="erreur" titre={form.message} />{/if}

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] lg:items-end" data-sveltekit-keepfocus>
		<input type="hidden" name="taille" value={data.taille} />
		<div>
			<label for="q" class="mb-1 block text-sm font-semibold">Nom, description, référence</label>
			<input id="q" name="q" type="search" value={f.q} class="py-2" />
		</div>
		<div>
			<label for="groupe" class="mb-1 block text-sm font-semibold">Groupe</label>
			<select id="groupe" name="groupe" class="py-2">
				<option value="">Tous</option>
				{#each groupes as g (g.value)}<option value={String(g.value)} selected={f.groupe === String(g.value)}>{g.label}</option>{/each}
			</select>
		</div>
		<div>
			<label for="prix_distributeur_max" class="mb-1 block text-sm font-semibold">Prix distrib. max.</label>
			<input id="prix_distributeur_max" name="prix_distributeur_max" type="number" min="0" value={f.prix_distributeur_max} class="py-2" />
		</div>
		<div>
			<label for="prix_public_max" class="mb-1 block text-sm font-semibold">Prix public max.</label>
			<input id="prix_public_max" name="prix_public_max" type="number" min="0" value={f.prix_public_max} class="py-2" />
		</div>
		<div>
			<label for="quantite_max" class="mb-1 block text-sm font-semibold">Stock max.</label>
			<input id="quantite_max" name="quantite_max" type="number" min="0" value={f.quantite_max} class="py-2" />
		</div>
		<div>
			<label for="etat" class="mb-1 block text-sm font-semibold">État</label>
			<select id="etat" name="etat" class="py-2">
				<option value="">Tous</option>
				<option value="1" selected={f.etat === '1'}>Non traité</option>
				<option value="2" selected={f.etat === '2'}>Autorisé</option>
				<option value="3" selected={f.etat === '3'}>Supprimé</option>
			</select>
		</div>
		<Bouton type="submit" variante="fleuve" taille="sm">Filtrer</Bouton>
	</form>

	{#if data.liste.items.length}
		<div class="carte overflow-x-auto">
			<table class="w-full text-left text-[15px]">
				<caption class="sr-only">Produits</caption>
				<thead class="bg-sable/60 text-sm text-ardoise">
					<tr>
						<th scope="col" class="px-3 py-2.5 font-semibold">Produit</th>
						<th scope="col" class="hidden px-3 py-2.5 font-semibold md:table-cell">Groupe</th>
						<th scope="col" class="px-3 py-2.5 text-right font-semibold">Distrib.</th>
						<th scope="col" class="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Non distrib.</th>
						<th scope="col" class="px-3 py-2.5 text-right font-semibold">Public</th>
						<th scope="col" class="px-3 py-2.5 text-right font-semibold">Stock</th>
						<th scope="col" class="px-3 py-2.5 font-semibold">État</th>
						<th scope="col" class="px-3 py-2.5"><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.liste.items as p (p.id)}
						<tr class="border-t border-fleuve-900/5 hover:bg-creme">
							<td class="px-3 py-2">
								<a href="/gestion/referentiels/produits/{p.id}" class="flex items-center gap-3">
									{#if p.photo_url}<img src={p.photo_url} alt="" class="size-10 shrink-0 rounded-lg object-cover" loading="lazy" />{:else}<span class="grid size-10 shrink-0 place-items-center rounded-lg bg-sable text-fleuve-600"><Package class="size-5" aria-hidden="true" /></span>{/if}
									<span class="min-w-0">
										<span class="block font-semibold text-fleuve-700 hover:underline">{p.nom}</span>
										{#if p.reference}<span class="block text-sm text-ardoise">Réf. {p.reference}</span>{/if}
									</span>
								</a>
							</td>
							<td class="hidden px-3 py-2 md:table-cell">{libelle(data.enums, 'GroupeProduit', p.groupe) || `Groupe ${p.groupe}`}</td>
							<td class="montant px-3 py-2 text-right">{nombre(p.prix_distributeur)}</td>
							<td class="montant hidden px-3 py-2 text-right lg:table-cell">{nombre(p.prix_non_distributeur)}</td>
							<td class="montant px-3 py-2 text-right">{nombre(p.prix_public)}</td>
							<td class="montant px-3 py-2 text-right {p.quantite_stock <= 0 ? 'font-bold text-alerte' : ''}">{nombre(p.quantite_stock)}</td>
							<td class="px-3 py-2"><BadgeEtat etat={p.etat} libelles={{ 1: 'Non traité', 2: 'Autorisé', 3: 'Supprimé', 4: 'Clôturé' }} /></td>
							<td class="px-3 py-2 text-right">
								{#if p.etat !== 3}
									<form method="POST" action="?/supprimer" use:enhance={({ cancel }) => { if (!confirm(`Retirer « ${p.nom} » du catalogue ?`)) cancel(); }}>
										<input type="hidden" name="id" value={p.id} />
										<button class="grid size-10 place-items-center rounded-lg text-alerte hover:bg-alerte-50" title="Supprimer">
											<Trash2 class="size-4" aria-hidden="true" /><span class="sr-only">Supprimer {p.nom}</span>
										</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-sm text-ardoise">Prix en FCFA.</p>
		<TaillePage taille={data.taille} />
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide icone={Package} titre="Aucun produit ne correspond" texte="Modifiez les filtres ou ajoutez un produit.">
			<Bouton href="/gestion/referentiels/produits/nouveau">Nouveau produit</Bouton>
		</EtatVide>
	{/if}
</div>
