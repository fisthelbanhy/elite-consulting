<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import FormulaireReussite from '$lib/components/reussites/FormulaireReussite.svelte';

	let { data, form } = $props();
	const fiche = $derived(data.fiche);
</script>

<svelte:head>
	<title>{fiche ? 'Mon témoignage' : 'Raconter mon histoire'} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={data.autre ? `Témoignage ${fiche?.reference}` : fiche ? 'Mon témoignage de réussite' : 'Racontez votre réussite'}
	sousTitre="Votre parcours peut donner à quelqu'un le courage de se lancer. Prenez le temps : vous pourrez le compléter plus tard."
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/reussites', label: 'Réussites' }]}
>
	{#if fiche}
		<Bouton href="/reussites/{fiche.id}" variante="secondaire"><Eye class="size-5" aria-hidden="true" />Voir la page</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur max-w-3xl space-y-6 py-8">
	{#if data.enregistre && fiche}
		<Alerte type="succes" titre="Merci ! Votre témoignage est enregistré.">
			{fiche?.etat === 2 ? 'Il est publié.' : 'Il sera publié après relecture par la frangine : vous serez prévenu·e dans votre messagerie.'}
		</Alerte>
	{/if}
	{#if fiche}
		<p class="flex flex-wrap items-center gap-2 text-ardoise">
			Référence {fiche.reference} · <BadgeEtat etat={fiche.etat} libelles={{ 1: 'En attente de relecture', 2: 'Publié', 4: 'Retiré' }} />
		</p>
		{#if fiche.etat === 2 && !data.autre}
			<Alerte type="info" titre="Bon à savoir">Si vous modifiez un témoignage publié, il repasse en relecture avant d'être de nouveau visible.</Alerte>
		{/if}
	{/if}
	<FormulaireReussite
		{form}
		secteurs={data.secteurs}
		initial={fiche}
		retour={data.autre && fiche ? `/reussites/${fiche.id}` : ''}
		libelleBouton={fiche ? 'Enregistrer les modifications' : 'Envoyer mon témoignage'}
	/>
</div>
