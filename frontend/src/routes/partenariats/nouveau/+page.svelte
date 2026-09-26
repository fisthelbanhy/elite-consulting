<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulairePartenariat from '$lib/components/partenariats/FormulairePartenariat.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Proposer un partenariat ou un troc — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Proposer un partenariat ou un troc"
	sousTitre="Gratuit pour les membres : dites ce que vous avez et ce que vous cherchez."
	fil={[{ href: '/partenariats', label: 'Partenariat & troc' }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulairePartenariat {form} />
</div>
