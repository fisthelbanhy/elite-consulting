<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireArticle from '$lib/components/annonces/FormulaireArticle.svelte';
	import { date } from '$lib/format';

	let { data, form } = $props();
	const a = $derived(data.article);
</script>

<svelte:head>
	<title>Modifier {a.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier l'annonce {a.reference}"
	sousTitre="Publiée le {date(a.date_creation)} · {a.nombre_visites} consultation{a.nombre_visites > 1 ? 's' : ''}"
	fil={[{ href: '/annonces', label: 'Petites annonces' }, { href: `/annonces/${a.id}`, label: a.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireArticle {form} familles={data.familles} initial={a} libelleBouton="Enregistrer les modifications" />
</div>
