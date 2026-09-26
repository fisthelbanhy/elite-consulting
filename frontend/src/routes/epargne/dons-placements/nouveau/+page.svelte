<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireFond from '$lib/components/epargne/FormulaireFond.svelte';
	import AvertissementEpargne from '$lib/components/epargne/AvertissementEpargne.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Faire un don ou un placement — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Faire un don ou un placement"
	sousTitre="Enregistrez votre souscription, puis payez-la en toute sécurité : elle reçoit une référence FDS."
	fil={[{ href: '/epargne', label: 'Épargne solidaire' }, { href: '/epargne/dons-placements', label: 'Dons & placements' }]}
/>
<div class="conteneur max-w-3xl space-y-6 py-8">
	<AvertissementEpargne pin={false} />
	<FormulaireFond {form} statut={data.statut} />
</div>
