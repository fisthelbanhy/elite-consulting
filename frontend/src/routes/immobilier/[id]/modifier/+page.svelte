<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireBien from '$lib/components/immobilier/FormulaireBien.svelte';
	import { date } from '$lib/format';

	let { data, form } = $props();
	const b = $derived(data.bien);
</script>

<svelte:head>
	<title>Modifier {b.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier l'annonce {b.reference}"
	sousTitre="Publiée le {date(b.date_creation)} · {b.nombre_visites} consultation{b.nombre_visites > 1 ? 's' : ''}"
	fil={[{ href: '/immobilier', label: 'Immobilier' }, { href: `/immobilier/${b.id}`, label: b.reference }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireBien {form} villes={data.villes} initial={b} libelleBouton="Enregistrer les modifications" />
</div>
