<script lang="ts">
	import LockOpen from '@lucide/svelte/icons/lock-open';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Presentation from '$lib/components/decouverte/Presentation.svelte';
	import Questionnaire from '$lib/components/decouverte/Questionnaire.svelte';
	import ReponsesFiche from '$lib/components/decouverte/ReponsesFiche.svelte';
	import Correspondance from '$lib/components/decouverte/Correspondance.svelte';
	import Restitution from '$lib/components/diagnostic/Restitution.svelte';
	import { date } from '$lib/format';

	let { data, form } = $props();
	const fiche = $derived(data.fiche);
	const cloturee = $derived(fiche?.cloturee === 1);
</script>

<svelte:head>
	<title>Découverte de soi — {data.parametres.nom_site}</title>
	{#if data.visiteur}
		<meta
			name="description"
			content="La Découverte de soi : un bilan de 26 questions sur vos talents, votre entourage et votre motivation, lu par une conseillère de La Frangine. Gratuit et confidentiel."
		/>
	{:else}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<EnTetePage
	titre="Découverte de soi"
	sousTitre={data.visiteur
		? 'Le bilan complet pour bâtir un projet qui vous ressemble.'
		: fiche
			? 'Votre bilan personnel, suivi par votre conseillère.'
			: 'Répondez à votre rythme : chaque étape est enregistrée.'}
	surtitre="Se lancer"
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/decouverte-de-soi', label: 'Découverte de soi' }]}
/>

<div class="conteneur py-8">
	{#if data.visiteur}
		<Presentation />
	{:else}
		<div class="grid gap-8 lg:grid-cols-[1fr_20rem]">
			<div class="min-w-0 space-y-6">
				{#if data.enregistre}
					<Alerte type="succes" titre={fiche?.reference ? 'Votre fiche est enregistrée.' : 'Enregistrement effectué.'}>
						Votre conseillère la lira et vous répondra ici et dans votre messagerie.
					</Alerte>
				{/if}
				{#if fiche?.notes_conseillere}<Correspondance texte={fiche.notes_conseillere} />{/if}

				{#if cloturee && fiche}
					<Alerte type="info" titre="Votre fiche est clôturée.">Vous pouvez la rouvrir à tout moment pour la compléter.</Alerte>
					<ReponsesFiche {fiche} />
				{:else}
					<Questionnaire {form} {fiche} etape={data.etape} />
				{/if}
			</div>

			<aside class="space-y-6">
				{#if fiche}
					<section class="carte space-y-3 p-5" aria-labelledby="titre-ma-fiche">
						<h2 id="titre-ma-fiche" class="text-lg font-bold">Ma fiche</h2>
						<dl class="space-y-1 text-[15px]">
							<div class="flex justify-between gap-2"><dt class="text-ardoise">Référence</dt><dd class="font-semibold">{fiche.reference}</dd></div>
							<div class="flex justify-between gap-2"><dt class="text-ardoise">Créée le</dt><dd class="font-semibold">{date(fiche.date_creation)}</dd></div>
							<div class="flex justify-between gap-2"><dt class="text-ardoise">Statut</dt><dd class="font-semibold">{cloturee ? 'Clôturée' : 'Ouverte'}</dd></div>
						</dl>
						<Formulaire action="?/cloture" {form} cle="cloture">
							{#snippet children({ envoi })}
								<input type="hidden" name="cloturee" value={cloturee ? '0' : '1'} />
								{#if cloturee}
									<Bouton type="submit" variante="fleuve" pleineLargeur chargement={envoi}><LockOpen class="size-5" aria-hidden="true" />Rouvrir ma fiche</Bouton>
								{:else}
									<Bouton type="submit" variante="secondaire" pleineLargeur chargement={envoi}><Lock class="size-5" aria-hidden="true" />Clôturer ma fiche</Bouton>
									<p class="mt-2 text-sm text-ardoise">Clôturez-la quand votre bilan est terminé. Vous pourrez la rouvrir.</p>
								{/if}
							{/snippet}
						</Formulaire>
					</section>
				{/if}
				<section class="carte p-5">
					<h2 class="text-lg font-bold">Une question en attendant ?</h2>
					<p class="mt-2 text-[15px] text-ardoise">Écrivez à votre conseillère dans votre messagerie : elle vous répond personnellement.</p>
					<Bouton href="/espace/messages" variante="secondaire" class="mt-4" pleineLargeur>Ma messagerie</Bouton>
				</section>
			</aside>
		</div>

		{#if fiche?.diagnostic}
			<details class="carte mt-10 p-6">
				<summary class="cursor-pointer font-display text-lg font-bold text-fleuve-800">
					Votre diagnostic du {date(fiche.date_diagnostic)} : {fiche.diagnostic.profil.titre}
				</summary>
				<div class="mt-6"><Restitution restitution={fiche.diagnostic} titreNiveau={3} /></div>
			</details>
		{:else if !fiche}
			<p class="mt-8 text-ardoise">
				Vous préférez commencer plus court ? <a href="/diagnostic" class="lien">Faites le diagnostic gratuit en 3 minutes</a> : vos réponses rempliront déjà une partie de cette fiche.
			</p>
		{/if}
	{/if}
</div>
