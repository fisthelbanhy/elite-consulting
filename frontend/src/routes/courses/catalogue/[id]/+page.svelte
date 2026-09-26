<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import FormulaireArticleCatalogue from '$lib/components/courses/FormulaireArticleCatalogue.svelte';

	let { data, form } = $props();
	const a = $derived(data.article);
	const etats = [
		{ value: 1, label: 'En attente (non traité)' },
		{ value: 2, label: 'Publié (autorisé)' },
		{ value: 3, label: 'Supprimé' }
	];
</script>

<svelte:head>
	<title>{a.nom} — catalogue — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={a.nom}
	sousTitre={a.boutique ? `Catalogue de ${a.boutique.pseudonyme}` : undefined}
	fil={[{ href: '/courses', label: 'Courses & livraison' }, { href: '/courses/catalogue', label: 'Catalogue' }]}
/>
<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="min-w-0"><FormulaireArticleCatalogue {form} initial={a} libelleBouton="Enregistrer les modifications" /></div>
	<aside>
		<PanneauModeration etat={a.etat} peutModerer={a.peut_moderer} peutModifier={a.peut_modifier} {form} {etats} />
	</aside>
</div>
