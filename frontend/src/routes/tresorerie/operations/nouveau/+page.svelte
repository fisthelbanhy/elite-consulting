<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulaireOperations from '$lib/components/tresorerie/FormulaireOperations.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Programmer des opérations bancaires — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie
	titre="Programmer des opérations"
	sousTitre="Saisissez jusqu’à 15 ordres en une fois : ils partagent une même référence et votre banque les reçoit par e-mail."
	fil={[{ href: '/tresorerie/operations', label: 'Opérations bancaires' }]}
/>
<div class="conteneur max-w-5xl py-8">
	<FormulaireOperations {form} banques={data.banques} lignesInitiales={data.lignes} />
</div>
