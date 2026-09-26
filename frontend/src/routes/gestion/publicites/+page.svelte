<script lang="ts">
	import { page } from '$app/state';
	import Plus from '@lucide/svelte/icons/plus';
	import Table from '@lucide/svelte/icons/table';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import FiltresPublicites from '$lib/components/publicites/FiltresPublicites.svelte';
	import ListePublicitesGestion from '$lib/components/publicites/ListePublicitesGestion.svelte';

	let { data } = $props();

	/** Même recherche, autre affichage (F-ADM-38). */
	function lienVue(vue: 'tableau' | 'cartes') {
		const u = new URL(page.url);
		u.searchParams.set('vue', vue);
		return u.pathname + u.search;
	}
</script>

<svelte:head>
	<title>Publicités — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur space-y-6 py-6">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Gestion</p>
			<h1 class="text-3xl font-bold">Publicités</h1>
			<p class="mt-1 text-ardoise">Au plus 10 publicités actives de la période sont diffusées, au hasard, dans les encarts du site.</p>
		</div>
		<Bouton href="/gestion/publicites/nouvelle"><Plus class="size-5" aria-hidden="true" />Nouvelle publicité</Bouton>
	</header>

	{#if data.supprime}<Alerte type="succes" titre="La publicité a été supprimée." />{/if}

	<FiltresPublicites filtres={data.filtres} choix={data.choix} />

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-ardoise" aria-live="polite">{data.liste.total} publicité{data.liste.total > 1 ? 's' : ''}</p>
		<nav aria-label="Affichage" class="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-fleuve-900/5">
			<a
				href={lienVue('tableau')}
				aria-current={data.filtres.vue === 'tableau' ? 'true' : undefined}
				class="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[15px] font-semibold {data.filtres.vue === 'tableau'
					? 'bg-fleuve-700 text-white'
					: 'text-fleuve-700 hover:bg-fleuve-50'}"
			>
				<Table class="size-4" aria-hidden="true" />Tableau
			</a>
			<a
				href={lienVue('cartes')}
				aria-current={data.filtres.vue === 'cartes' ? 'true' : undefined}
				class="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[15px] font-semibold {data.filtres.vue === 'cartes'
					? 'bg-fleuve-700 text-white'
					: 'text-fleuve-700 hover:bg-fleuve-50'}"
			>
				<LayoutGrid class="size-4" aria-hidden="true" />Cartes
			</a>
		</nav>
	</div>

	{#if data.liste.items.length}
		<ListePublicitesGestion items={data.liste.items} vue={data.filtres.vue} />
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide icone={Megaphone} titre="Aucune publicité ne correspond" texte="Modifiez les filtres ou créez une nouvelle publicité.">
			<Bouton href="/gestion/publicites/nouvelle" variante="secondaire">Nouvelle publicité</Bouton>
		</EtatVide>
	{/if}
</div>
