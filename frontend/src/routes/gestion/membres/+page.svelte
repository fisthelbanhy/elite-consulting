<script lang="ts">
	/** Liste des membres (legacy `pmembre.php`, F-ADM-05 à F-ADM-08). */
	import { enhance } from '$app/forms';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import Check from '@lucide/svelte/icons/check';
	import Users from '@lucide/svelte/icons/users';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import TaillePage from '$lib/components/gestion/TaillePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateCourte, relatif, telephone } from '$lib/format';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const types: Record<number, { lib: string; ton: 'laterite' | 'soleil' | 'neutre' }> = {
		1: { lib: 'Gestionnaire', ton: 'laterite' },
		2: { lib: 'Master', ton: 'soleil' },
		3: { lib: 'Membre', ton: 'neutre' }
	};
	const exportHref = $derived(`/gestion/membres/export?${new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== 'page')).toString()}`);
	const filtreActif = $derived(!!(f.q || f.type_compte || f.categorie || f.ville_id || f.etat));
</script>

<svelte:head>
	<title>Membres — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Membres" sousTitre="{data.liste.total} membre{data.liste.total > 1 ? 's' : ''}{filtreActif ? ' correspondant aux filtres' : ''}" fil={[{ href: '/gestion/membres', label: 'Membres' }]}>
	<Bouton href={exportHref} variante="secondaire" taille="sm"><Download class="size-4" aria-hidden="true" />Exporter (CSV)</Bouton>
	<Bouton href="/gestion/membres/nouveau" taille="sm"><Plus class="size-4" aria-hidden="true" />Nouveau membre</Bouton>
</EnTeteGestion>

<div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
	{#if form?.message && !form?.succes}<Alerte type="erreur" titre={form.message} />{/if}
	{#if form?.succes}<Alerte type="succes" titre={form.succes} />{/if}

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(5,1fr)_auto] lg:items-end" data-sveltekit-keepfocus>
		<input type="hidden" name="taille" value={data.taille} />
		<div>
			<label for="q" class="mb-1 block text-sm font-semibold">Rechercher</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Nom, téléphone, observation…" class="py-2 pl-9" />
			</div>
		</div>
		<div>
			<label for="type_compte" class="mb-1 block text-sm font-semibold">Type</label>
			<select id="type_compte" name="type_compte" class="py-2">
				<option value="">Tous</option>
				{#each [1, 2, 3] as t (t)}<option value={String(t)} selected={f.type_compte === String(t)}>{types[t].lib}</option>{/each}
			</select>
		</div>
		<div>
			<label for="categorie" class="mb-1 block text-sm font-semibold">Personnalité</label>
			<select id="categorie" name="categorie" class="py-2">
				<option value="">Toutes</option>
				<option value="1" selected={f.categorie === '1'}>Physique</option>
				<option value="2" selected={f.categorie === '2'}>Morale</option>
			</select>
		</div>
		<div>
			<label for="ville_id" class="mb-1 block text-sm font-semibold">Ville</label>
			<select id="ville_id" name="ville_id" class="py-2">
				<option value="">Toutes</option>
				{#each data.villes as v (v.id)}<option value={String(v.id)} selected={f.ville_id === String(v.id)}>{v.nom}</option>{/each}
			</select>
		</div>
		<div>
			<label for="etat" class="mb-1 block text-sm font-semibold">État</label>
			<select id="etat" name="etat" class="py-2">
				<option value="">Actifs</option>
				<option value="1" selected={f.etat === '1'}>À valider</option>
				<option value="2" selected={f.etat === '2'}>Validés</option>
				<option value="3" selected={f.etat === '3'}>Supprimés</option>
			</select>
		</div>
		<div>
			<label for="tri" class="mb-1 block text-sm font-semibold">Tri</label>
			<select id="tri" name="tri" class="py-2">
				<option value="nom">Par nom</option>
				<option value="recents" selected={f.tri === 'recents'}>Plus récents</option>
			</select>
		</div>
		<div class="flex gap-2">
			<Bouton type="submit" variante="fleuve" taille="sm">Filtrer</Bouton>
			{#if filtreActif}<Bouton href="/gestion/membres" variante="fantome" taille="sm">Effacer</Bouton>{/if}
		</div>
	</form>

	{#if data.liste.items.length}
		<div class="carte overflow-x-auto">
			<table class="w-full text-left text-[15px]">
				<caption class="sr-only">Membres</caption>
				<thead class="bg-sable/60 text-sm text-ardoise">
					<tr>
						<th scope="col" class="px-3 py-2.5 font-semibold">Nom</th>
						<th scope="col" class="px-3 py-2.5 font-semibold">Type</th>
						<th scope="col" class="px-3 py-2.5 font-semibold">Téléphone</th>
						<th scope="col" class="hidden px-3 py-2.5 font-semibold lg:table-cell">E-mail</th>
						<th scope="col" class="hidden px-3 py-2.5 font-semibold md:table-cell">Ville</th>
						<th scope="col" class="px-3 py-2.5 font-semibold">État</th>
						<th scope="col" class="hidden px-3 py-2.5 font-semibold xl:table-cell">Inscrit</th>
						<th scope="col" class="hidden px-3 py-2.5 font-semibold xl:table-cell">Dernière connexion</th>
					</tr>
				</thead>
				<tbody>
					{#each data.liste.items as m (m.id)}
						<tr class="border-t border-fleuve-900/5 align-top hover:bg-creme">
							<td class="px-3 py-2.5">
								<a href="/gestion/membres/{m.id}" class="font-semibold text-fleuve-700 hover:underline">{m.nom}</a>
								<span class="block text-sm text-ardoise">{m.pseudonyme} · {m.categorie === 2 ? 'Morale' : 'Physique'} · {m.code_membre}</span>
							</td>
							<td class="px-3 py-2.5"><Badge ton={types[m.type_compte]?.ton ?? 'neutre'}>{types[m.type_compte]?.lib ?? '—'}</Badge></td>
							<td class="px-3 py-2.5 whitespace-nowrap">{telephone(m.telephone) || '—'}</td>
							<td class="hidden max-w-56 truncate px-3 py-2.5 lg:table-cell">{m.email ?? '—'}</td>
							<td class="hidden px-3 py-2.5 md:table-cell">{m.ville?.nom ?? '—'}</td>
							<td class="px-3 py-2.5">
								<div class="flex flex-wrap items-center gap-2">
									<BadgeEtat etat={m.etat} libelles={{ 1: 'À valider', 2: 'Validé', 3: 'Supprimé' }} />
									{#if m.etat === 1 && data.gestionnaire.droit_activation}
										<form method="POST" action="?/valider" use:enhance>
											<input type="hidden" name="id" value={m.id} />
											<button class="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-foret-700 ring-1 ring-foret-600/40 hover:bg-foret-50">
												<Check class="size-4" aria-hidden="true" />Valider<span class="sr-only"> {m.nom}</span>
											</button>
										</form>
									{/if}
								</div>
							</td>
							<td class="hidden px-3 py-2.5 whitespace-nowrap xl:table-cell">{dateCourte(m.date_creation)}</td>
							<td class="hidden px-3 py-2.5 whitespace-nowrap text-ardoise xl:table-cell">{m.derniere_connexion ? relatif(m.derniere_connexion) : 'Jamais'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<TaillePage taille={data.taille} />
		</div>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide icone={Users} titre="Aucun membre ne correspond" texte="Modifiez ou effacez les filtres pour élargir la recherche.">
			<Bouton href="/gestion/membres" variante="secondaire">Effacer les filtres</Bouton>
		</EtatVide>
	{/if}
</div>
