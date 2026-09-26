<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireProjet from '$lib/components/projets/FormulaireProjet.svelte';
	import AvertissementProjets from '$lib/components/projets/AvertissementProjets.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Présenter mon projet — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Présenter mon projet"
	sousTitre="Gratuit. Votre projet est publié immédiatement, relu par la frangine et visible de tous les membres."
	fil={[{ href: '/financer', label: 'Financer & épargner' }, { href: '/projets', label: 'Appels de fonds' }]}
/>
<div class="conteneur max-w-3xl space-y-6 py-8">
	<AvertissementProjets />
	<FormulaireProjet {form} secteurs={data.secteurs} villes={data.villes} entreprises={data.entreprises} />
</div>
