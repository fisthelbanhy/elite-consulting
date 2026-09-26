<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireMarche from '$lib/components/marches/FormulaireMarche.svelte';

	let { data, form } = $props();
	const m = $derived(data.marche);
</script>

<svelte:head>
	<title>Modifier le marché {m.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier le marché {m.reference}"
	fil={[{ href: '/marches', label: 'Marchés et projets' }, { href: `/marches/${m.id}`, label: m.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireMarche {form} initial={m} annuler="/marches/{m.id}" libelleBouton="Enregistrer les modifications" />
</div>
