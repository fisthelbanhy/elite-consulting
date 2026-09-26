<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import ChoixBoutique from '$lib/components/courses/ChoixBoutique.svelte';
	import FormulaireCourse from '$lib/components/courses/FormulaireCourse.svelte';

	let { data, form } = $props();
	const c = $derived(data.course);
</script>

<svelte:head>
	<title>Modifier la course {c.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Modifier la course {c.reference}"
	sousTitre="Les frais de service restent ceux fixés à la commande."
	fil={[{ href: '/courses', label: 'Courses & livraison' }, { href: `/courses/${c.id}`, label: c.reference }]}
/>
<div class="conteneur max-w-4xl space-y-6 py-8">
	<ChoixBoutique boutiques={data.boutiques} boutique={data.boutique} />
	<FormulaireCourse
		{form}
		boutique={data.boutique}
		catalogue={data.catalogue}
		initial={c}
		gestion={!!data.membre?.est_gestionnaire}
		aujourdhui={data.aujourdhui}
		lienAnnuler="/courses/{c.id}"
	/>
</div>
