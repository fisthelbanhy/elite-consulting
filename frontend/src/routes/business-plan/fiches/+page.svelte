<script lang="ts">
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateHeure, tronquer } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const l = $derived(data.liste);
	const etats = { 1: ['Brouillon', 'soleil'], 2: ['Envoyé', 'foret'], 3: ['Supprimé', 'alerte'], 4: ['Clôturé', 'neutre'] } as const;
</script>

<svelte:head>
	<title>Business plans des membres — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Business plans des membres"
	sousTitre="Les auto-diagnostics envoyés sont à relire en priorité ; répondez au membre dans la messagerie."
	fil={[{ href: '/business-plan', label: 'Business plan' }, { href: '/business-plan/fiches', label: 'Fiches' }]}
/>

<div class="conteneur space-y-6 py-8">
	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher dans la description du projet</label>
			<input id="q" name="q" type="search" value={f.q} />
		</div>
		<div>
			<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat" name="etat">
				<option value="">Tous (sauf supprimés)</option>
				<option value="2" selected={f.etat === '2'}>Envoyés</option>
				<option value="1" selected={f.etat === '1'}>Brouillons</option>
				<option value="4" selected={f.etat === '4'}>Clôturés</option>
				<option value="3" selected={f.etat === '3'}>Supprimés</option>
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	{#if l.items.length}
		<p class="text-ardoise" aria-live="polite">{l.total} business plan{l.total > 1 ? 's' : ''}</p>
		<div class="carte overflow-x-auto">
			<table class="w-full min-w-[40rem] text-left text-[15px]">
				<thead class="bg-sable text-sm text-ardoise">
					<tr>
						<th scope="col" class="px-4 py-3">Référence</th>
						<th scope="col" class="px-4 py-3">Date</th>
						<th scope="col" class="px-4 py-3">Membre</th>
						<th scope="col" class="px-4 py-3">Projet</th>
						<th scope="col" class="px-4 py-3">État</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-fleuve-900/5">
					{#each l.items as bp (bp.id)}
						{@const e = etats[bp.etat as 1 | 2 | 3 | 4] ?? etats[1]}
						<tr>
							<td class="px-4 py-3"><a href="/business-plan/fiches/{bp.id}" class="lien font-semibold">{bp.reference || `#${bp.id}`}</a></td>
							<td class="px-4 py-3 whitespace-nowrap">{dateHeure(bp.date_creation)}</td>
							<td class="px-4 py-3">
								{#if bp.membre}<a href="/gestion/membres/{bp.membre.id}" class="lien">{bp.membre.nom}</a><span class="block text-sm text-ardoise">{bp.membre.pseudonyme}</span>{/if}
							</td>
							<td class="px-4 py-3"><span class="font-semibold">{bp.type_activite}</span><span class="block text-sm text-ardoise">{tronquer(bp.description_projet, 60)}</span></td>
							<td class="px-4 py-3"><Badge ton={e[1]}>{e[0]}</Badge></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide icone={ClipboardList} titre="Aucun business plan" texte="Aucune fiche ne correspond à ces critères." />
	{/if}
</div>
