<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireSujet from '$lib/components/conseil-financier/FormulaireSujet.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Nouveau sujet — Conseil financier — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={data.rubrique === '1' ? 'Poser une question à un conseiller' : 'Publier une actu'}
	sousTitre="Un conseiller vous répond ici, en général sous 24 h ouvrées. Vous êtes prévenu·e dans votre espace."
	fil={[{ href: '/conseil-financier', label: 'Conseil financier' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireSujet {form} rubriqueInitiale={data.rubrique} annuler="/conseil-financier?rubrique={data.rubrique}" />
</div>
