<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import FormulaireAdhesion from '$lib/components/likelemba/FormulaireAdhesion.svelte';
	import { fcfa, libelle } from '$lib/format';

	let { data, form } = $props();
	const g = $derived(data.groupe);
	const soiMeme = $derived(!g.peut_gerer || !data.membres);
</script>

<svelte:head>
	<title>Rejoindre le likelemba {g.code} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={soiMeme ? `Rejoindre le likelemba ${g.code}` : `Inscrire un membre au likelemba ${g.code}`}
	sousTitre="Cotisation de {fcfa(g.montant_cotisation)}, {libelle(data.enums, 'Periodicite', g.periodicite).toLowerCase()}. Votre code d'adhérent est attribué dès l'enregistrement."
	fil={[{ href: '/likelemba', label: 'Likelemba' }, { href: `/likelemba/${g.id}`, label: g.code }]}
/>
<div class="conteneur max-w-3xl py-8">
	<FormulaireAdhesion
		{form}
		gerer={g.peut_gerer}
		membres={data.membres}
		retour="/likelemba/{g.id}"
		libelleBouton={soiMeme ? 'Rejoindre le likelemba' : "Enregistrer l'adhésion"}
	/>
</div>
