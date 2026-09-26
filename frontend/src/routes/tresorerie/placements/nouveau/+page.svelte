<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulairePlacement from '$lib/components/tresorerie/FormulairePlacement.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Nouveau placement — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie
	titre="Nouveau placement"
	sousTitre="Quelques informations suffisent : un conseiller revient vers vous avec les propositions des banques."
	fil={[{ href: '/tresorerie/placements', label: 'Placements' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulairePlacement {form} banques={data.banques} />
</div>
