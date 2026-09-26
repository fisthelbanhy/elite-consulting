<script lang="ts">
	/** Recherche de l'annuaire (F-S6-03) : mots, secteur, domaine (du secteur), ville, tri.
	 * Formulaire GET : les filtres restent dans l'URL (pagination, partage, retour arrière). */
	import Search from '@lucide/svelte/icons/search';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { Secteur, Ville } from '$lib/types';

	let {
		secteurs,
		villes,
		filtres
	}: {
		secteurs: Secteur[];
		villes: Ville[];
		filtres: { q: string; secteur_id: string; domaine_id: string; ville_id: string; tri: string };
	} = $props();

	const domaines = $derived(secteurs.find((s) => String(s.id) === filtres.secteur_id)?.domaines ?? []);
	const soumettre = (e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit();
</script>

<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end" data-sveltekit-keepfocus>
	<div class="sm:col-span-2 lg:col-span-1">
		<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
		<div class="relative">
			<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
			<input id="q" name="q" type="search" value={filtres.q} placeholder="Nom, activité, gérant…" class="pl-10" maxlength="100" />
		</div>
	</div>
	<div>
		<label for="secteur_id" class="mb-1.5 block text-[15px] font-semibold">Secteur</label>
		<select id="secteur_id" name="secteur_id" onchange={soumettre}>
			<option value="">Tous les secteurs</option>
			{#each secteurs as s (s.id)}<option value={s.id} selected={String(s.id) === filtres.secteur_id}>{s.libelle}</option>{/each}
		</select>
	</div>
	<div>
		<label for="ville_id" class="mb-1.5 block text-[15px] font-semibold">Ville</label>
		<select id="ville_id" name="ville_id" onchange={soumettre}>
			<option value="">Toutes les villes</option>
			{#each villes as v (v.id)}<option value={v.id} selected={String(v.id) === filtres.ville_id}>{v.nom}</option>{/each}
		</select>
	</div>
	<Bouton type="submit" variante="fleuve">Rechercher</Bouton>

	{#if domaines.length}
		<div class="sm:col-span-2 lg:col-span-2">
			<label for="domaine_id" class="mb-1.5 block text-[15px] font-semibold">Domaine d'activité</label>
			<select id="domaine_id" name="domaine_id" onchange={soumettre}>
				<option value="">Tous les domaines du secteur</option>
				{#each domaines as d (d.id)}<option value={d.id} selected={String(d.id) === filtres.domaine_id}>{d.libelle}</option>{/each}
			</select>
		</div>
	{/if}
	<div class={domaines.length ? 'sm:col-span-2 lg:col-span-2' : 'sm:col-span-2 lg:col-span-4 lg:max-w-xs'}>
		<label for="tri" class="mb-1.5 block text-[15px] font-semibold">Trier par</label>
		<select id="tri" name="tri" onchange={soumettre}>
			<option value="" selected={!filtres.tri || filtres.tri === 'secteur'}>Secteur d'activité</option>
			<option value="nom" selected={filtres.tri === 'nom'}>Nom (A → Z)</option>
			<option value="recent" selected={filtres.tri === 'recent'}>Dernières inscrites</option>
			<option value="visites" selected={filtres.tri === 'visites'}>Les plus consultées</option>
		</select>
	</div>
</form>
