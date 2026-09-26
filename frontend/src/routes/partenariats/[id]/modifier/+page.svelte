<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulairePartenariat from '$lib/components/partenariats/FormulairePartenariat.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Modifier {data.fiche.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier la proposition {data.fiche.reference}"
	fil={[{ href: '/partenariats', label: 'Partenariat & troc' }, { href: `/partenariats/${data.fiche.id}`, label: data.fiche.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulairePartenariat {form} initial={data.fiche} libelleBouton="Enregistrer les modifications" />
</div>
