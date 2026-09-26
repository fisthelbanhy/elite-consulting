<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireGroupe from '$lib/components/likelemba/FormulaireGroupe.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Modifier le likelemba {data.groupe.code} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier le likelemba {data.groupe.code}"
	fil={[{ href: '/likelemba', label: 'Likelemba' }, { href: `/likelemba/${data.groupe.id}`, label: data.groupe.code }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireGroupe {form} membres={data.membres} initial={data.groupe} libelleBouton="Enregistrer les modifications" />
</div>
