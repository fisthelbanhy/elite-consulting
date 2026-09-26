<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireMarche from '$lib/components/marches/FormulaireMarche.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Publier un appel d'offres — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Publier un appel d'offres"
	sousTitre="Gratuit. Le marché est publié tout de suite et relu par nos équipes."
	fil={[{ href: '/marches', label: 'Marchés et projets' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireMarche {form} annuler="/marches" />
</div>
