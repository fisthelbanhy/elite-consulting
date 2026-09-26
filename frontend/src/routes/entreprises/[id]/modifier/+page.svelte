<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireEntreprise from '$lib/components/entreprises/FormulaireEntreprise.svelte';

	let { data, form } = $props();
	const e = $derived(data.entreprise);
</script>

<svelte:head>
	<title>Modifier {e.nom} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier la fiche de {e.nom}"
	sousTitre="Référence {e.reference}"
	fil={[{ href: '/entreprises', label: 'Annuaire' }, { href: `/entreprises/${e.id}`, label: e.nom }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireEntreprise
		{form}
		secteurs={data.secteurs}
		villes={data.villes}
		formes={data.enums.FormeJuridique ?? []}
		initial={e}
		annuler="/entreprises/{e.id}"
		libelleBouton="Enregistrer les modifications"
	/>
</div>
