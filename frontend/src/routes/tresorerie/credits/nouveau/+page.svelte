<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulaireCredit from '$lib/components/tresorerie/FormulaireCredit.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Nouvelle demande de crédit — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie
	titre="Nouvelle demande de crédit"
	sousTitre="Un conseiller relit votre demande, vous aide à la compléter et la présente aux banques choisies."
	fil={[{ href: '/tresorerie/credits', label: 'Demandes de crédit' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireCredit {form} />
</div>
