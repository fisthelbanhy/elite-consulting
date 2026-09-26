<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireAnnonce from '$lib/components/emplois/FormulaireAnnonce.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Publier une fiche emploi — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Publier une fiche emploi"
	sousTitre="Gratuit pour les membres. Votre fiche est publiée immédiatement et relue par nos équipes."
	fil={[{ href: '/emplois', label: 'Emplois' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireAnnonce {form} secteurs={data.secteurs} typeInitial={data.type} />
</div>
