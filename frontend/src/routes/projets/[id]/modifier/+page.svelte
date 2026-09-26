<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireProjet from '$lib/components/projets/FormulaireProjet.svelte';

	let { data, form } = $props();
	// Un gestionnaire qui modifie le projet d'un autre ne voit pas ses propres entreprises
	const entreprises = $derived(
		data.projet.est_auteur ? data.entreprises : data.projet.entreprise ? [data.projet.entreprise] : []
	);
</script>

<svelte:head>
	<title>Modifier {data.projet.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier le projet {data.projet.reference}"
	fil={[{ href: '/projets', label: 'Appels de fonds' }, { href: `/projets/${data.projet.id}`, label: data.projet.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireProjet {form} secteurs={data.secteurs} villes={data.villes} {entreprises} initial={data.projet} libelleBouton="Enregistrer les modifications" />
</div>
