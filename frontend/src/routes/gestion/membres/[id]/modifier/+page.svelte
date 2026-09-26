<script lang="ts">
	/** Modification complète d'une fiche membre, nom et personnalité compris (F-ADM-10). */
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import FormulaireMembre from '$lib/components/gestion/FormulaireMembre.svelte';

	let { data, form } = $props();
	const m = $derived(data.membre);
</script>

<svelte:head>
	<title>Modifier {m.nom} — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion
	titre="Modifier la fiche"
	sousTitre={m.nom}
	fil={[{ href: '/gestion/membres', label: 'Membres' }, { href: `/gestion/membres/${m.id}`, label: m.pseudonyme || m.nom }]}
/>

<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
	<FormulaireMembre
		{form}
		initial={m}
		villes={data.villes}
		secteurs={data.secteurs}
		enums={data.enums}
		peutAttribuer={data.gestionnaire.droit_attribution}
		annuler="/gestion/membres/{m.id}"
	/>
</div>
