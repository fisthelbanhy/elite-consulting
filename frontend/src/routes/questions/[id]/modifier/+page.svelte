<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireSujet from '$lib/components/questions/FormulaireSujet.svelte';

	let { data, form } = $props();
	const s = $derived(data.sujet);
</script>

<svelte:head>
	<title>Modifier le sujet {s.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier le sujet"
	sousTitre="Changer la confidentialité s'applique aussi aux réponses déjà publiées."
	fil={[{ href: '/questions', label: 'Questions & conseils' }, { href: `/questions/${s.id}`, label: s.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireSujet {form} initial={s} libelleBouton="Enregistrer les modifications" annuler="/questions/{s.id}" />
</div>
