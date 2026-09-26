<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireBien from '$lib/components/immobilier/FormulaireBien.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Publier une annonce immobilière — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Publier une annonce immobilière"
	sousTitre="Gratuit pour les membres. Votre annonce est publiée immédiatement et relue par nos équipes."
	fil={[{ href: '/immobilier', label: 'Immobilier' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireBien {form} villes={data.villes} typeInitial={data.type} />
</div>
