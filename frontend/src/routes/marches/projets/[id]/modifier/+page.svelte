<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireProjet from '$lib/components/marches/FormulaireProjet.svelte';

	let { data, form } = $props();
	const p = $derived(data.projet);
</script>

<svelte:head>
	<title>Modifier le projet {p.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier le projet {p.reference}"
	fil={[{ href: '/marches?onglet=projets', label: 'Projets' }, { href: `/marches/projets/${p.id}`, label: p.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireProjet {form} initial={p} annuler="/marches/projets/{p.id}" libelleBouton="Enregistrer les modifications" />
</div>
