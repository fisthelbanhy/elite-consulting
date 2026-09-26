<script lang="ts">
	/**
	 * Journaux des visites anonymes et des connexions de membres : filtres par période (correctif
	 * de l'erreur fatale legacy), plage horaire, IP et membre ; purge confirmée.
	 */
	import { enhance } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import TaillePage from '$lib/components/gestion/TaillePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateHeure, entier } from '$lib/format';
	import type { ConnexionLigne, VisiteLigne } from '$lib/types/gestion';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const connexions = $derived(data.journal === 'connexions');
	const peutPurger = $derived(data.gestionnaire.droit_activation);
	let coches = $state<number[]>([]);
	afterNavigate(() => (coches = []));
	const tous = $derived(data.liste.items.length > 0 && coches.length === data.liste.items.length);

	const quand = (x: VisiteLigne | ConnexionLigne) => ('date_heure' in x ? x.date_heure : x.date_connexion);
	function toutCocher(e: Event) {
		coches = (e.currentTarget as HTMLInputElement).checked ? data.liste.items.map((x) => x.id) : [];
	}
</script>

<svelte:head>
	<title>Journaux — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Journaux" sousTitre="Qui passe sur le site, et quand." fil={[{ href: '/gestion/journaux', label: 'Journaux' }]}>
	{#snippet bas()}
		<div class="mt-4">
			<Onglets
				label="Journal"
				onglets={[
					{ href: '/gestion/journaux', label: 'Visites anonymes', actif: !connexions },
					{ href: '/gestion/journaux?journal=connexions', label: 'Connexions des membres', actif: connexions }
				]}
			/>
		</div>
	{/snippet}
</EnTeteGestion>

<div class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
	{#if form?.cle === 'purge'}
		{#if form.succes}<Alerte type="succes" titre={form.succes} />{:else if form.message}<Alerte type="erreur" titre={form.message} champs={form.champs} />{/if}
	{/if}

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end" data-sveltekit-keepfocus>
		{#if connexions}<input type="hidden" name="journal" value="connexions" />{/if}
		<input type="hidden" name="taille" value={data.taille} />
		<div>
			<label for="du" class="mb-1 block text-sm font-semibold">Du</label>
			<input id="du" name="du" type="date" value={f.du} class="py-2" />
		</div>
		<div>
			<label for="au" class="mb-1 block text-sm font-semibold">Au</label>
			<input id="au" name="au" type="date" value={f.au} class="py-2" />
		</div>
		<div>
			<label for="heure_debut" class="mb-1 block text-sm font-semibold">De (heure)</label>
			<input id="heure_debut" name="heure_debut" type="time" value={f.heure_debut} class="py-2" />
		</div>
		<div>
			<label for="heure_fin" class="mb-1 block text-sm font-semibold">À (heure)</label>
			<input id="heure_fin" name="heure_fin" type="time" value={f.heure_fin} class="py-2" />
		</div>
		<div>
			<label for="ip" class="mb-1 block text-sm font-semibold">Adresse IP</label>
			<input id="ip" name="ip" type="search" value={f.ip} class="py-2 font-mono" />
		</div>
		{#if connexions}
			<div>
				<label for="membre_id" class="mb-1 block text-sm font-semibold">Membre</label>
				<select id="membre_id" name="membre_id" class="py-2">
					<option value="">Tous</option>
					{#each data.membres as o (o.value)}<option value={String(o.value)} selected={f.membre_id === String(o.value)}>{o.label}</option>{/each}
				</select>
			</div>
		{/if}
		<div class="flex gap-2 lg:col-span-6">
			<Bouton type="submit" variante="fleuve" taille="sm">Filtrer</Bouton>
			<Bouton href={connexions ? '/gestion/journaux?journal=connexions' : '/gestion/journaux'} variante="fantome" taille="sm">Effacer</Bouton>
		</div>
	</form>

	<p class="text-[15px]" aria-live="polite"><strong class="montant">{entier(data.liste.total)}</strong> {connexions ? 'connexion' : 'visite'}{data.liste.total > 1 ? 's' : ''}</p>

	{#if data.liste.items.length}
		<form
			method="POST"
			action="?/purger"
			use:enhance={({ cancel }) => {
				if (!confirm(`Supprimer définitivement ${coches.length} ligne(s) du journal ?`)) return cancel();
				return async ({ update }) => {
					await update();
					coches = [];
				};
			}}
		>
			<input type="hidden" name="journal" value={data.journal} />
			<div class="carte overflow-x-auto">
				<table class="w-full text-left text-[15px]">
					<caption class="sr-only">{connexions ? 'Connexions des membres' : 'Visites anonymes'}</caption>
					<thead class="bg-sable/60 text-sm text-ardoise">
						<tr>
							{#if peutPurger}
								<th scope="col" class="w-10 px-3 py-2.5"><input type="checkbox" checked={tous} onchange={toutCocher} aria-label="Tout sélectionner" /></th>
							{/if}
							<th scope="col" class="px-3 py-2.5 font-semibold">Date et heure</th>
							<th scope="col" class="px-3 py-2.5 font-semibold">Adresse IP</th>
							<th scope="col" class="px-3 py-2.5 font-semibold">Membre</th>
						</tr>
					</thead>
					<tbody>
						{#each data.liste.items as x (x.id)}
							<tr class="border-t border-fleuve-900/5 hover:bg-creme">
								{#if peutPurger}
									<td class="px-3 py-2"><input type="checkbox" name="ids" value={x.id} bind:group={coches} aria-label="Sélectionner la ligne du {dateHeure(quand(x))}" /></td>
								{/if}
								<td class="px-3 py-2 whitespace-nowrap">{dateHeure(quand(x))}</td>
								<td class="px-3 py-2 font-mono text-sm">{x.adresse_ip || '—'}</td>
								<td class="px-3 py-2">
									{#if x.membre}<a href="/gestion/membres/{x.membre.id}" class="lien">{x.membre.nom}</a>{:else}<span class="text-ardoise">—</span>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if peutPurger}
				<div class="mt-3">
					<Bouton type="submit" variante="danger" taille="sm">
						<Trash2 class="size-4" aria-hidden="true" />Supprimer la sélection ({coches.length})
					</Bouton>
				</div>
			{/if}
		</form>
		<TaillePage taille={data.taille} />
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide icone={ScrollText} titre="Aucune ligne" texte="Aucun passage ne correspond à ces critères." />
	{/if}

	{#if peutPurger}
		<section class="carte p-5" aria-labelledby="titre-purge">
			<h2 id="titre-purge" class="text-lg font-bold">Purger l'historique</h2>
			<p class="mt-1 text-[15px] text-ardoise">Supprime toutes les lignes de ce journal antérieures à la date choisie.</p>
			<form
				method="POST"
				action="?/purgerAvant"
				class="mt-3 flex flex-wrap items-end gap-3"
				use:enhance={({ cancel, formData }) => {
					if (!confirm(`Supprimer définitivement tout le journal avant le ${formData.get('avant')} ?`)) cancel();
				}}
			>
				<input type="hidden" name="journal" value={data.journal} />
				<div>
					<label for="avant" class="mb-1 block text-sm font-semibold">Avant le</label>
					<input id="avant" name="avant" type="date" required class="py-2" />
				</div>
				<Bouton type="submit" variante="danger" taille="sm">Purger</Bouton>
			</form>
		</section>
	{/if}
</div>
