<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulaireContentieux from '$lib/components/tresorerie/FormulaireContentieux.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Nouveau dossier de contentieux — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie
	titre="Faire le point sur ma dette"
	sousTitre="Vos chiffres restent confidentiels : seuls vous et votre conseiller les voyez. Un chiffre approximatif vaut mieux qu’une case vide."
	fil={[{ href: '/tresorerie/contentieux', label: 'Contentieux' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireContentieux {form} />
</div>
