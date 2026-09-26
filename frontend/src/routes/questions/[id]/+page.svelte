<script lang="ts">
	import { page } from '$app/state';
	import Lock from '@lucide/svelte/icons/lock';
	import Share2 from '@lucide/svelte/icons/share-2';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import ReponseSujet from '$lib/components/questions/ReponseSujet.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure, jsonLd, lienPartageWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const s = $derived(data.sujet);
	const prive = $derived(s.confidentialite === 1);
	const connecte = $derived(!!data.membre);
	const suite = $derived(encodeURIComponent(page.url.pathname));

	// Données structurées « QAPage » pour les sujets publics seulement
	const donnees = $derived(
		prive
			? null
			: jsonLd({
					'@context': 'https://schema.org',
					'@type': 'QAPage',
					mainEntity: {
						'@type': 'Question',
						name: s.objet,
						text: s.texte,
						answerCount: s.reponses.length,
						dateCreated: s.date_creation,
						author: { '@type': 'Person', name: s.auteur?.pseudonyme ?? data.parametres.nom_site },
						suggestedAnswer: s.reponses.map((r) => ({
							'@type': 'Answer',
							text: r.texte,
							dateCreated: r.date_creation,
							author: { '@type': 'Person', name: r.auteur?.pseudonyme ?? 'Membre' }
						}))
					}
				})
	);
</script>

<svelte:head>
	<title>{s.objet} — Questions & conseils — {data.parametres.nom_site}</title>
	{#if prive}
		<meta name="robots" content="noindex" />
	{:else}
		<meta name="description" content={tronquer(s.texte, 155)} />
		{@html donnees}
	{/if}
</svelte:head>

<EnTetePage
	titre={s.objet}
	surtitre={prive ? 'Question privée' : 'Questions & conseils'}
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/questions', label: 'Questions & conseils' }]}
>
	{#if !prive}
		<Bouton href={lienPartageWhatsApp(`${s.objet} — ${page.url.href}`)} variante="secondaire" target="_blank" rel="noopener">
			<Share2 class="size-5" aria-hidden="true" />Partager
		</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre="Votre question est publiée.">
				{prive ? 'La frangine va vous répondre ici.' : 'Les membres et la frangine peuvent maintenant vous répondre.'} Vous serez prévenu·e dans votre messagerie.
			</Alerte>
		{:else if data.modifie}
			<Alerte type="succes" titre="Modification effectuée." />
		{/if}

		<article class="carte p-6" aria-labelledby="auteur-sujet">
			<div class="flex flex-wrap items-center gap-3">
				<Avatar src={s.auteur?.photo_url} nom={s.auteur?.pseudonyme} />
				<div class="min-w-0 flex-1">
					<p id="auteur-sujet" class="font-semibold">
						{s.auteur?.pseudonyme ?? 'La frangine'}
						{#if s.auteur_nom}<span class="font-normal text-ardoise">· {s.auteur_nom}</span>{/if}
					</p>
					<p class="text-sm text-ardoise">
						<time datetime={s.date_creation ?? undefined}>{dateHeure(s.date_creation)}</time> · {s.reference}
					</p>
				</div>
				{#if prive}<Badge ton="soleil"><Lock class="size-3" aria-hidden="true" />Privé : vous et la frangine</Badge>{/if}
			</div>
			<p class="mt-4 text-lg whitespace-pre-line">{s.texte}</p>
		</article>

		<section class="carte px-6 py-2" aria-labelledby="titre-reponses">
			<h2 id="titre-reponses" class="pt-4 text-xl font-bold">
				{s.reponses.length ? `${s.reponses.length} réponse${s.reponses.length > 1 ? 's' : ''}` : 'Aucune réponse pour le moment'}
			</h2>
			{#if s.reponses.length}
				<div class="divide-y divide-fleuve-900/5">
					{#each s.reponses as r (r.id)}
						<ReponseSujet reponse={r} peutModerer={s.peut_moderer} {form} />
					{/each}
				</div>
			{:else}
				<p class="pt-2 pb-4 text-ardoise">{prive ? 'La frangine lit votre question et vous répond très vite.' : 'Vous connaissez la réponse ? Partagez votre expérience.'}</p>
			{/if}
		</section>

		<section class="carte p-6" aria-labelledby="titre-repondre">
			<h2 id="titre-repondre" class="text-xl font-bold">{prive && s.est_auteur ? 'Compléter votre question' : 'Répondre'}</h2>
			{#if s.etat === 4}
				<p class="mt-2 text-ardoise">Ce sujet est clôturé : il n'accepte plus de réponses.</p>
			{:else if !connecte}
				<p class="mt-2 text-[15px] text-ardoise">Créez votre compte gratuit pour répondre et poser vos propres questions.</p>
				<div class="mt-4 flex flex-wrap gap-3">
					<Bouton href="/inscription?suite={suite}">Créer mon compte</Bouton>
					<Bouton href="/connexion?suite={suite}" variante="fantome">J'ai déjà un compte</Bouton>
				</div>
			{:else if s.peut_repondre}
				<Formulaire action="?/repondre" {form} cle="reponse" reinitialiser class="mt-4">
					{#snippet children({ envoi })}
						<Zone label="Votre réponse" id="texte-nouvelle-reponse" lignes={4} requis {...champ(form, 'texte', '', 'reponse')} />
						<Bouton type="submit" class="mt-4" chargement={envoi}>Publier ma réponse</Bouton>
					{/snippet}
				</Formulaire>
			{:else}
				<p class="mt-2 text-ardoise">Ce sujet n'accepte pas de réponses pour le moment.</p>
			{/if}
		</section>

		<a href="/questions" class="lien inline-flex items-center gap-1"><ArrowLeft class="size-4" aria-hidden="true" />Retour aux sujets</a>
	</div>

	<aside class="space-y-6">
		<PanneauModeration
			etat={s.etat}
			peutModerer={s.peut_moderer}
			peutModifier={s.peut_modifier}
			lienModifier="/questions/{s.id}/modifier"
			{form}
			etats={[
				{ value: 1, label: 'Masqué (non traité)' },
				{ value: 2, label: 'Publié' },
				{ value: 4, label: 'Clôturé (plus de réponses)' },
				{ value: 3, label: 'Supprimé' }
			]}
		/>
		<section class="carte p-5">
			<h2 class="text-lg font-bold">Besoin d'un vrai coup de main ?</h2>
			<p class="mt-2 text-[15px] text-ardoise">Faites le point en 3 minutes : votre frangine vous propose un plan d'action.</p>
			<Bouton href="/diagnostic" variante="fleuve" class="mt-4" pleineLargeur>Faire mon diagnostic gratuit</Bouton>
		</section>
	</aside>
</div>
