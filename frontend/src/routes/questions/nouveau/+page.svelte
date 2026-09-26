<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireSujet from '$lib/components/questions/FormulaireSujet.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Poser une question — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Poser une question"
	sousTitre="Votre question est publiée tout de suite. Vous êtes prévenu·e dans votre messagerie dès qu'on vous répond."
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/questions', label: 'Questions & conseils' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireSujet {form} confidentialiteInitiale={data.confidentialite} />
</div>
