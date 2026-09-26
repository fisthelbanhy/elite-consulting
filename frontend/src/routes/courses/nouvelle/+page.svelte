<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import ChoixBoutique from '$lib/components/courses/ChoixBoutique.svelte';
	import FormulaireCourse from '$lib/components/courses/FormulaireCourse.svelte';
	import PresentationCourses from '$lib/components/courses/PresentationCourses.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Commander une course — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Commander une course"
	sousTitre="Votre liste, votre prix maxi, votre heure de livraison. On s'occupe du reste."
	fil={[{ href: '/courses', label: 'Courses & livraison' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="min-w-0 space-y-6">
		<ChoixBoutique boutiques={data.boutiques} boutique={data.boutique} />
		<FormulaireCourse {form} boutique={data.boutique} catalogue={data.catalogue} gestion={!!data.membre?.est_gestionnaire} aujourdhui={data.aujourdhui} />
	</div>
	<aside class="order-first lg:order-none">
		<PresentationCourses compact />
	</aside>
</div>
