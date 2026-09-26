<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireProjet from '$lib/components/marches/FormulaireProjet.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Publier un projet — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Publier un projet"
	sousTitre="Présentez un programme qui cherche des partenaires, des prestataires ou des bénéficiaires."
	fil={[{ href: '/marches', label: 'Marchés et projets' }, { href: '/marches?onglet=projets', label: 'Projets' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireProjet {form} annuler="/marches?onglet=projets" />
</div>
