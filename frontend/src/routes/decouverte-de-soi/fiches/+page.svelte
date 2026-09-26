<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateCourte } from '$lib/format';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const peutSupprimer = $derived(!!data.membre?.droit_activation);
</script>

<svelte:head>
	<title>Fiches Découverte de soi — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Fiches Découverte de soi"
	sousTitre="{data.liste.total} fiche{data.liste.total > 1 ? 's' : ''} Lisungui. Cliquez sur une référence pour lire la fiche et répondre au membre."
	surtitre="Gestion"
	fil={[{ href: '/gestion', label: 'Gestion' }, { href: '/decouverte-de-soi/fiches', label: 'Découverte de soi' }]}
>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/decouverte-de-soi/fiches', label: 'Toutes', actif: !f.cloturee && !f.diagnostic },
					{ href: '/decouverte-de-soi/fiches?diagnostic=true', label: 'Avec diagnostic', actif: f.diagnostic === 'true' },
					{ href: '/decouverte-de-soi/fiches?cloturee=2', label: 'Ouvertes', actif: f.cloturee === '2' },
					{ href: '/decouverte-de-soi/fiches?cloturee=1', label: 'Clôturées', actif: f.cloturee === '1' }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur py-8">
	{#if form?.cle === 'liste'}
		<Alerte type={form.succes ? 'succes' : 'erreur'} titre={form.succes ?? form.message} class="mb-6" />
	{/if}

	<form method="GET" role="search" class="carte mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end" data-sveltekit-keepfocus>
		{#if f.cloturee}<input type="hidden" name="cloturee" value={f.cloturee} />{/if}
		{#if f.diagnostic}<input type="hidden" name="diagnostic" value={f.diagnostic} />{/if}
		<div class="flex-1">
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Référence, nom ou pseudonyme du membre" class="pl-10" />
			</div>
		</div>
		<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
	</form>

	{#if data.liste.items.length}
		<div class="carte overflow-x-auto">
			<table class="w-full min-w-[40rem] text-left text-[15px]">
				<caption class="sr-only">Fiches Découverte de soi</caption>
				<thead class="border-b border-fleuve-100 text-sm text-ardoise">
					<tr>
						<th scope="col" class="px-4 py-3 font-semibold">Référence</th>
						<th scope="col" class="px-4 py-3 font-semibold">Date</th>
						<th scope="col" class="px-4 py-3 font-semibold">Membre</th>
						<th scope="col" class="px-4 py-3 font-semibold">Suivi</th>
						{#if peutSupprimer}<th scope="col" class="px-4 py-3 font-semibold"><span class="sr-only">Actions</span></th>{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-fleuve-900/5">
					{#each data.liste.items as fi (fi.id)}
						<tr>
							<td class="px-4 py-3"><a href="/decouverte-de-soi/fiches/{fi.id}" class="lien font-semibold">{fi.reference}</a></td>
							<td class="px-4 py-3 whitespace-nowrap">{dateCourte(fi.date_creation)}</td>
							<td class="px-4 py-3">
								<a href="/gestion/membres/{fi.membre.id}" class="lien">{fi.membre.nom}</a>
								<span class="block text-sm text-ardoise">{fi.membre.pseudonyme}</span>
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-1.5">
									{#if fi.date_diagnostic}<Badge ton="laterite">Diagnostic {dateCourte(fi.date_diagnostic)}</Badge>{/if}
									<Badge ton={fi.cloturee === 1 ? 'neutre' : 'foret'}>{fi.cloturee === 1 ? 'Clôturée' : 'Ouverte'}</Badge>
									{#if fi.etat_fiche === 1}<Badge ton="soleil">À étudier</Badge>{/if}
								</div>
							</td>
							{#if peutSupprimer}
								<td class="px-4 py-3 text-right">
									<Formulaire action="?/supprimer" confirmer="Supprimer la fiche {fi.reference} de {fi.membre.nom} ?">
										{#snippet children({ envoi })}
											<input type="hidden" name="id" value={fi.id} />
											<Bouton type="submit" variante="danger" taille="sm" chargement={envoi} aria-label="Supprimer la fiche {fi.reference}">
												<Trash2 class="size-4" aria-hidden="true" />Supprimer
											</Bouton>
										{/snippet}
									</Formulaire>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide
			icone={ClipboardList}
			titre="Aucune fiche ici"
			texte="Les fiches apparaissent quand un membre remplit sa Découverte de soi ou envoie son diagnostic gratuit."
		/>
	{/if}
</div>
