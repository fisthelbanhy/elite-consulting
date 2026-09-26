<script lang="ts">
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Questionnaire from '$lib/components/decouverte/Questionnaire.svelte';
	import ReponsesFiche from '$lib/components/decouverte/ReponsesFiche.svelte';
	import PanneauSuivi from '$lib/components/decouverte/PanneauSuivi.svelte';
	import Restitution from '$lib/components/diagnostic/Restitution.svelte';
	import { champ } from '$lib/forms';
	import { date, dateHeure, libelle } from '$lib/format';

	let { data, form } = $props();
	const fi = $derived(data.fiche);
</script>

<svelte:head>
	<title>Fiche {fi.reference} — Découverte de soi — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Fiche {fi.reference}"
	surtitre="Découverte de soi"
	fil={[{ href: '/gestion', label: 'Gestion' }, { href: '/decouverte-de-soi/fiches', label: 'Découverte de soi' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="min-w-0 space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Modification effectuée." />{/if}
		{#if fi.etat === 3}<Alerte type="attention" titre="Cette fiche est supprimée." />{/if}

		<section class="carte flex flex-wrap items-center gap-4 p-6">
			<Avatar src={fi.membre.photo_url} nom={fi.membre.nom} taille="lg" />
			<div class="min-w-0 flex-1">
				<p class="font-display text-xl font-bold text-fleuve-800">{fi.membre.nom}</p>
				<p class="text-ardoise">{fi.membre.pseudonyme}{fi.membre.sexe !== 3 ? ` · ${libelle(data.enums, 'Sexe', fi.membre.sexe)}` : ''}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<Badge>Créée le {date(fi.date_creation)}</Badge>
					<Badge ton={fi.cloturee === 1 ? 'neutre' : 'foret'}>{fi.cloturee === 1 ? 'Clôturée' : 'Ouverte'}</Badge>
					{#if fi.pourcentage_implication}<Badge ton="fleuve">Implication {fi.pourcentage_implication} %</Badge>{/if}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<Bouton href="/gestion/membres/{fi.membre.id}" variante="secondaire" taille="sm">Profil du membre</Bouton>
				<Bouton href="/gestion/messages?membre={fi.membre.id}" variante="secondaire" taille="sm"><MessageCircle class="size-4" aria-hidden="true" />Messages</Bouton>
			</div>
		</section>

		<section class="carte p-6" aria-labelledby="titre-correspondance-frangine">
			<h2 id="titre-correspondance-frangine" class="text-xl font-bold">Correspondance la frangine</h2>
			<p class="mt-1 text-[15px] text-ardoise">Visible par le membre sur sa fiche, en lecture seule. Il est prévenu dans sa messagerie.</p>
			{#if fi.notes_membre}
				<div class="mt-4 rounded-xl bg-sable p-4">
					<p class="text-sm font-semibold text-ardoise">Correspondance membre</p>
					<p class="mt-1 whitespace-pre-line">{fi.notes_membre}</p>
				</div>
			{/if}
			<Formulaire action="?/correspondance" {form} cle="correspondance" class="mt-4">
				{#snippet children({ envoi })}
					<Zone label="Votre réponse au membre" lignes={5} {...champ(form, 'notes_conseillere', fi.notes_conseillere, 'correspondance')} />
					<Bouton type="submit" class="mt-4" chargement={envoi}>Enregistrer la correspondance</Bouton>
				{/snippet}
			</Formulaire>
		</section>

		{#if fi.diagnostic}
			<section aria-labelledby="titre-diag" class="space-y-4">
				<h2 id="titre-diag" class="text-xl font-bold">Diagnostic du {dateHeure(fi.date_diagnostic)}</h2>
				<dl class="carte divide-y divide-fleuve-900/5 px-6 py-2">
					{#each fi.diagnostic.reponses as r (r.question)}
						<div class="grid gap-1 py-3 sm:grid-cols-2"><dt class="text-ardoise">{r.question}</dt><dd class="font-semibold">{r.reponse}</dd></div>
					{/each}
				</dl>
				<Restitution restitution={fi.diagnostic} titreNiveau={3} />
			</section>
		{/if}

		{#if data.modifier}
			<Questionnaire {form} fiche={fi} mode="complet" libelleFin="Enregistrer les réponses" />
		{:else}
			<ReponsesFiche fiche={fi} />
		{/if}
	</div>

	<div class="space-y-6">
		<PanneauSuivi fiche={fi} {form} modifier={data.modifier} />
	</div>
</div>
