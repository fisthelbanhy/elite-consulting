<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireDossier from '$lib/components/accompagnement/FormulaireDossier.svelte';

	let { data, form } = $props();
	const q = $derived(data.questionnaire);
</script>

<svelte:head>
	<title>Nouveau dossier {q.libelle} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Nouveau dossier : {q.libelle}"
	sousTitre="Commencez par l’objet, puis répondez aux questions que vous maîtrisez déjà. Sauvegardez quand vous voulez."
	fil={[{ href: '/accompagnement', label: 'Accompagnement' }, { href: `/accompagnement/${q.slug}`, label: q.libelle }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireDossier questionnaire={q} {form} />
</div>
