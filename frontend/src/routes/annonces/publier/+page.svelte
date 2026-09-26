<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireArticle from '$lib/components/annonces/FormulaireArticle.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Publier une petite annonce — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Publier une petite annonce"
	sousTitre="Gratuit pour les membres. Votre annonce est publiée immédiatement et relue par nos équipes."
	fil={[{ href: '/annonces', label: 'Petites annonces' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireArticle {form} familles={data.familles} typeInitial={data.type} />
</div>
