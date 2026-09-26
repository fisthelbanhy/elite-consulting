<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireGroupe from '$lib/components/likelemba/FormulaireGroupe.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Créer un likelemba — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Créer un likelemba"
	sousTitre="Le groupe reçoit un code LKB… et s'ouvre immédiatement aux adhésions."
	fil={[{ href: '/likelemba', label: 'Likelemba' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireGroupe {form} membres={data.membres} />
</div>
