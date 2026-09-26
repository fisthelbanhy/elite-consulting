<script lang="ts">
	/** Liste des fiches bien-être (besoin → produits conseillés). */
	import { enhance } from '$app/forms';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { tronquer } from '$lib/format';

	let { data, form } = $props();
	const f = $derived(data.filtres);
</script>

<svelte:head>
	<title>Fiches bien-être — Référentiels — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion
	titre="Fiches bien-être"
	sousTitre="Chaque fiche associe un besoin à des produits conseillés, exactement comme sur la page publique."
	fil={[{ href: '/gestion/referentiels', label: 'Référentiels' }, { href: '/gestion/referentiels/maladies', label: 'Fiches bien-être' }]}
>
	<Bouton href="/gestion/referentiels/maladies/nouveau" taille="sm"><Plus class="size-4" aria-hidden="true" />Nouvelle fiche</Bouton>
</EnTeteGestion>

<div class="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
	{#if !data.parametres.module_sante_actif}
		<Alerte type="attention" titre="Module bien-être désactivé">Les fiches ne sont pas visibles du public (Paramètres › Modules).</Alerte>
	{/if}
	{#if data.enregistre}<Alerte type="succes" titre={data.enregistre === 'cree' ? 'Enregistrement effectué.' : 'Modification effectuée.'} />{/if}
	{#if form?.succes}<Alerte type="succes" titre={form.succes} />{:else if form?.message}<Alerte type="erreur" titre={form.message} />{/if}

	<form method="GET" class="carte flex flex-wrap items-end gap-3 p-4" data-sveltekit-keepfocus>
		<div class="min-w-48 flex-1">
			<label for="q" class="mb-1 block text-sm font-semibold">Rechercher</label>
			<input id="q" name="q" type="search" value={f.q} class="py-2" />
		</div>
		<div class="min-w-36">
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
		<ul class="carte divide-y divide-fleuve-900/5">
			{#each data.liste.items as x (x.id)}
				<li class="flex items-center gap-3 p-4">
					<a href="/gestion/referentiels/maladies/{x.id}" class="min-w-0 flex-1">
						<span class="block font-semibold text-fleuve-700 hover:underline">{x.libelle}</span>
						<span class="block text-sm text-ardoise">{x.nombre_produits} produit{x.nombre_produits > 1 ? 's' : ''} conseillé{x.nombre_produits > 1 ? 's' : ''}{x.description ? ` · ${tronquer(x.description, 90)}` : ''}</span>
					</a>
					<BadgeEtat etat={x.etat} libelles={{ 1: 'Non traité', 2: 'Publiée', 3: 'Supprimée', 4: 'Clôturée' }} />
					{#if x.etat !== 3}
						<form method="POST" action="?/supprimer" use:enhance={({ cancel }) => { if (!confirm(`Retirer la fiche « ${x.libelle} » ?`)) cancel(); }}>
							<input type="hidden" name="id" value={x.id} />
							<button class="grid size-10 place-items-center rounded-lg text-alerte hover:bg-alerte-50" title="Supprimer">
								<Trash2 class="size-4" aria-hidden="true" /><span class="sr-only">Supprimer {x.libelle}</span>
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide icone={HeartPulse} titre="Aucune fiche" texte="Créez la première fiche bien-être.">
			<Bouton href="/gestion/referentiels/maladies/nouveau">Nouvelle fiche</Bouton>
		</EtatVide>
	{/if}
</div>
