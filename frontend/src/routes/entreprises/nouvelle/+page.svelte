<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import FormulaireEntreprise from '$lib/components/entreprises/FormulaireEntreprise.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Inscrire mon entreprise dans l'annuaire — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Inscrire mon entreprise"
	sousTitre="Gratuit. Votre fiche est publiée tout de suite dans l'annuaire et relue par nos équipes."
	fil={[{ href: '/entreprises', label: 'Annuaire' }]}
/>
<div class="conteneur max-w-3xl space-y-6 py-8">
	{#if data.modele.personne_morale}
		<Alerte type="info" titre="Nous avons repris les informations de votre profil.">Vérifiez-les et complétez la fiche avant de l'enregistrer.</Alerte>
	{/if}
	<FormulaireEntreprise
		{form}
		secteurs={data.secteurs}
		villes={data.villes}
		formes={data.enums.FormeJuridique ?? []}
		initial={data.modele}
		annuler="/entreprises"
	/>
</div>
