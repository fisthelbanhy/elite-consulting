<script lang="ts">
	/** Page générique d'un référentiel simple : liste filtrée + formulaire de création / modification. */
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import Search from '@lucide/svelte/icons/search';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Database from '@lucide/svelte/icons/database';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import TaillePage from '$lib/components/gestion/TaillePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { champ } from '$lib/forms';
	import { entier } from '$lib/format';
	import { ETATS_REFERENTIEL, REFERENTIELS, valeurChemin } from '$lib/components/gestion/referentiels';

	let { data, form } = $props();
	const cfg = $derived(REFERENTIELS[data.cle]);
	const f = $derived(data.filtres);
	const el = $derived(data.element);
	const filtreParent = $derived(cfg.parent === 'ville' ? 'ville_id' : cfg.parent === 'secteur' ? 'secteur_id' : null);

	function lienModifier(id: number) {
		const u = new URL(page.url);
		u.searchParams.set('modifier', String(id));
		u.searchParams.delete('ok');
		return `${u.pathname}${u.search}#formulaire`;
	}
	const lienNouveau = $derived.by(() => {
		const u = new URL(page.url);
		u.searchParams.delete('modifier');
		u.searchParams.delete('ok');
		return `${u.pathname}${u.search}#formulaire`;
	});
	function initiale(nom: string, genre: string): unknown {
		if (el) return el[nom];
		if (genre === 'etat') return 2;
		if (genre === 'ville') return f.ville_id;
		if (genre === 'secteur') return f.secteur_id;
		return '';
	}
</script>

<svelte:head>
	<title>{cfg.titre} — Référentiels — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion
	titre={cfg.titre}
	sousTitre="{cfg.description} {data.liste.total} élément{data.liste.total > 1 ? 's' : ''}."
	fil={[{ href: '/gestion/referentiels', label: 'Référentiels' }, { href: `/gestion/referentiels/${cfg.cle}`, label: cfg.titre }]}
>
	<Bouton href={lienNouveau} taille="sm"><Plus class="size-4" aria-hidden="true" />{cfg.nouveau}</Bouton>
</EnTeteGestion>

<div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
	<div class="min-w-0 space-y-4">
		{#if data.enregistre}<Alerte type="succes" titre={data.enregistre === 'cree' ? 'Enregistrement effectué.' : 'Modification effectuée.'} />{/if}
		{#if form?.cle === 'suppression'}
			{#if form.succes}<Alerte type="succes" titre={form.succes} />{:else if form.message}<Alerte type="erreur" titre={form.message} />{/if}
		{/if}

		<form method="GET" class="carte flex flex-wrap items-end gap-3 p-4" data-sveltekit-keepfocus>
			<input type="hidden" name="taille" value={data.taille} />
			<div class="min-w-48 flex-1">
				<label for="q" class="mb-1 block text-sm font-semibold">Rechercher</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q" name="q" type="search" value={f.q} class="py-2 pl-9" />
				</div>
			</div>
			{#if filtreParent}
				<div class="min-w-40">
					<label for="parent" class="mb-1 block text-sm font-semibold">{cfg.parent === 'ville' ? 'Ville' : 'Secteur'}</label>
					<select id="parent" name={filtreParent} class="py-2">
						<option value="">Tous</option>
						{#each data.optionsParent as o (o.value)}<option value={String(o.value)} selected={f[filtreParent] === String(o.value)}>{o.label}</option>{/each}
					</select>
				</div>
			{/if}
			{#if cfg.filtreEtat}
				<div class="min-w-36">
					<label for="etat" class="mb-1 block text-sm font-semibold">État</label>
					<select id="etat" name="etat" class="py-2">
						<option value="">Tous</option>
						{#each ETATS_REFERENTIEL as o (o.value)}<option value={String(o.value)} selected={f.etat === String(o.value)}>{o.label}</option>{/each}
					</select>
				</div>
			{/if}
			<Bouton type="submit" variante="fleuve" taille="sm">Filtrer</Bouton>
		</form>

		{#if data.liste.items.length}
			<div class="carte overflow-x-auto">
				<table class="w-full text-left text-[15px]">
					<caption class="sr-only">{cfg.titre}</caption>
					<thead class="bg-sable/60 text-sm text-ardoise">
						<tr>
							{#each cfg.colonnes as c (c.cle)}
								<th scope="col" class="px-3 py-2.5 font-semibold {c.genre === 'nombre' ? 'text-right' : ''} {c.secondaire ? 'hidden md:table-cell' : ''}">{c.label}</th>
							{/each}
							<th scope="col" class="px-3 py-2.5 text-right font-semibold"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.liste.items as x (x.id)}
							{@const nom = String(x[cfg.libelle] ?? '')}
							<tr class="border-t border-fleuve-900/5 hover:bg-creme {el?.id === x.id ? 'bg-fleuve-50' : ''}">
								{#each cfg.colonnes as c (c.cle)}
									{@const v = valeurChemin(x, c.cle)}
									<td class="px-3 py-2 {c.genre === 'nombre' ? 'montant text-right' : ''} {c.secondaire ? 'hidden md:table-cell' : ''}">
										{#if c.genre === 'etat'}<BadgeEtat etat={Number(v)} libelles={{ 1: 'Non traité', 2: 'Autorisé', 3: 'Supprimé', 4: 'Clôturé' }} />
										{:else if c.genre === 'nombre'}{entier(Number(v ?? 0))}
										{:else}{v ?? '—'}{/if}
									</td>
								{/each}
								<td class="px-3 py-2">
									<div class="flex justify-end gap-1">
										<a href={lienModifier(x.id)} class="grid size-10 place-items-center rounded-lg text-fleuve-700 hover:bg-fleuve-50" title="Modifier">
											<Pencil class="size-4" aria-hidden="true" /><span class="sr-only">Modifier {nom}</span>
										</a>
										{#if !(cfg.logique && x.etat === 3)}
											<form
												method="POST"
												action="?/supprimer"
												use:enhance={({ cancel }) => {
													if (!confirm(cfg.logique ? `Supprimer « ${nom} » ? Il ne sera plus proposé (réversible en modifiant l'état).` : `Supprimer définitivement « ${nom} » ?`)) cancel();
												}}
											>
												<input type="hidden" name="id" value={x.id} />
												<button class="grid size-10 place-items-center rounded-lg text-alerte hover:bg-alerte-50" title="Supprimer">
													<Trash2 class="size-4" aria-hidden="true" /><span class="sr-only">Supprimer {nom}</span>
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<TaillePage taille={data.taille} />
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide icone={Database} titre="Aucun élément" texte={f.q ? 'Aucun élément ne correspond à la recherche.' : 'Commencez par en créer un avec le formulaire.'} />
		{/if}
	</div>

	<aside id="formulaire" class="scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
		<section class="carte p-5" aria-labelledby="titre-formulaire">
			<h2 id="titre-formulaire" class="mb-4 text-lg font-bold">{el ? `Modifier « ${String(el[cfg.libelle] ?? '')} »` : cfg.nouveau}</h2>
			{#key el?.id ?? 'nouveau'}
				<Formulaire action="?/enregistrer" {form} cle="edition">
					{#snippet children({ envoi })}
						{#if el}<input type="hidden" name="id" value={el.id} />{/if}
						<div class="space-y-4">
							{#each cfg.champs as c (c.nom)}
								{@const props = champ(form, c.nom, initiale(c.nom, c.genre), 'edition')}
								{#if c.genre === 'zone'}
									<Zone label={c.label} lignes={3} requis={c.requis} aide={c.aide} {...props} />
								{:else if c.genre === 'etat'}
									<Liste label={c.label} vide={null} options={ETATS_REFERENTIEL} aide={c.aide} {...props} />
								{:else if c.genre === 'ville' || c.genre === 'secteur'}
									<Liste label={c.label} requis={c.requis} options={data.optionsParent} aide={c.aide} {...props} />
								{:else}
									<Saisie label={c.label} requis={c.requis} aide={c.aide} {...props} />
								{/if}
							{/each}
							<div class="flex flex-wrap gap-2">
								<Bouton type="submit" variante="fleuve" chargement={envoi}>{el ? 'Enregistrer' : 'Créer'}</Bouton>
								{#if el}<Bouton href={lienNouveau} variante="fantome">Annuler</Bouton>{/if}
							</div>
						</div>
					{/snippet}
				</Formulaire>
			{/key}
		</section>
	</aside>
</div>
