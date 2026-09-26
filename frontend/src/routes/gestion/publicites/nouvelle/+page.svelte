<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FormulairePublicite from '$lib/components/publicites/FormulairePublicite.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Nouvelle publicité — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur max-w-3xl space-y-6 py-6">
	<a href="/gestion/publicites" class="inline-flex min-h-11 items-center gap-2 font-semibold text-fleuve-700 hover:underline">
		<ArrowLeft class="size-5" aria-hidden="true" />Toutes les publicités
	</a>
	<header>
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Gestion</p>
		<h1 class="text-3xl font-bold">Nouvelle publicité</h1>
		<p class="mt-1 text-ardoise">Une référence PUB… est attribuée à l'enregistrement.</p>
	</header>
	<FormulairePublicite {form} choix={data.choix} choisirEtat={data.choisirEtat} libelleBouton="Créer la publicité" />
</div>
