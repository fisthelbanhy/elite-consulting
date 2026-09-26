<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireArticleCatalogue from '$lib/components/courses/FormulaireArticleCatalogue.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Ajouter un article au catalogue — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Ajouter un article"
	fil={[{ href: '/courses', label: 'Courses & livraison' }, { href: '/courses/catalogue', label: 'Catalogue' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireArticleCatalogue {form} boutiques={data.boutiques} />
</div>
