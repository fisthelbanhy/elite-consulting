<script lang="ts">
	/** Création d'un membre ou d'un gestionnaire (F-ADM-09). */
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import FormulaireMembre from '$lib/components/gestion/FormulaireMembre.svelte';
	import LienUnique from '$lib/components/gestion/LienUnique.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Nouveau membre — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Nouveau membre" sousTitre="Inscrire un membre ou un gestionnaire au nom de la frangine." fil={[{ href: '/gestion/membres', label: 'Membres' }, { href: '/gestion/membres/nouveau', label: 'Nouveau' }]} />

<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
	{#if form?.creation?.activation}
		<div class="space-y-5">
			<Alerte type="succes" titre="Fiche créée ({form.creation.reference})." />
			<LienUnique lien={form.creation.activation} titre="Lien d'activation du compte" />
			<div class="flex flex-wrap gap-3">
				<Bouton href="/gestion/membres/{form.creation.id}" variante="fleuve">Ouvrir la fiche</Bouton>
				<Bouton href="/gestion/membres/nouveau" variante="secondaire">Créer un autre membre</Bouton>
			</div>
		</div>
	{:else}
		<FormulaireMembre {form} villes={data.villes} secteurs={data.secteurs} enums={data.enums} peutAttribuer={data.gestionnaire.droit_attribution} annuler="/gestion/membres" />
	{/if}
</div>
