<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireAnnonce from '$lib/components/emplois/FormulaireAnnonce.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Modifier {data.annonce.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier la fiche {data.annonce.reference}"
	fil={[{ href: '/emplois', label: 'Emplois' }, { href: `/emplois/${data.annonce.id}`, label: data.annonce.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireAnnonce {form} secteurs={data.secteurs} initial={data.annonce} libelleBouton="Enregistrer les modifications" />
</div>
