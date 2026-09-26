<script lang="ts">
	import Lock from '@lucide/svelte/icons/lock';
	import Send from '@lucide/svelte/icons/send';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import FormulaireSujet from '$lib/components/conseil-financier/FormulaireSujet.svelte';
	import Reponse from '$lib/components/conseil-financier/Reponse.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure, lienWhatsApp } from '$lib/format';
	import { RUBRIQUES } from '$lib/types/conseil-financier';

	let { data, form } = $props();
	const s = $derived(data.sujet);
	const rubrique = $derived(RUBRIQUES[s.rubrique]);
	const edition = $derived(data.modifier && s.peut_modifier);
	const f = $derived(form as { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	const wa = $derived(data.parametres.whatsapp);
</script>

<svelte:head>
	<title>{s.objet} — {rubrique.titre} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={s.objet}
	surtitre={rubrique.titre}
	fil={[{ href: '/conseil-financier', label: 'Conseil financier' }, { href: `/conseil-financier?rubrique=${s.rubrique}`, label: rubrique.court }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre="Enregistrement effectué.">
				{s.rubrique === 1 ? 'Un conseiller vous répond ici ; vous serez prévenu·e dans votre espace.' : 'Votre actu est publiée.'}
			</Alerte>
		{/if}
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}

		{#if edition}
			<FormulaireSujet {form} initial={s} action="?/modifier" annuler="/conseil-financier/{s.id}" />
		{:else}
			<article class="carte p-6">
				<div class="flex items-start gap-4">
					<Avatar src={s.auteur?.photo_url} nom={s.auteur?.pseudonyme} taille="lg" />
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-xs font-semibold text-ardoise">{s.reference}</span>
							{#if s.confidentialite === 1}<Badge><Lock class="size-3" aria-hidden="true" />Privé : vous et votre conseiller</Badge>{/if}
							{#if s.etat === 4}<Badge>Clôturé</Badge>{/if}
						</div>
						<p class="mt-1 text-sm text-ardoise">{s.auteur?.pseudonyme ?? 'Membre'} · {dateHeure(s.date_creation)}</p>
						<p class="mt-4 whitespace-pre-line">{s.texte}</p>
					</div>
				</div>
			</article>
		{/if}

		<section aria-labelledby="titre-reponses" class="carte space-y-4 p-6">
			<h2 id="titre-reponses" class="text-xl font-bold">{s.reponses.length ? `Réponses (${s.reponses.length})` : 'Réponses'}</h2>
			{#each s.reponses as r (r.id)}
				<Reponse reponse={r} {form} />
			{:else}
				<p class="text-ardoise">{s.rubrique === 1 ? 'Votre conseiller prépare sa réponse : vous serez prévenu·e dans votre espace.' : 'Soyez le premier à réagir.'}</p>
			{/each}

			{#if s.peut_repondre}
				<Formulaire action="?/repondre" {form} cle="reponse" reinitialiser class="border-t border-fleuve-900/5 pt-4">
					{#snippet children({ envoi })}
						<Zone label={s.est_auteur ? 'Ajouter une précision' : 'Votre réponse'} lignes={4} requis minlength={2} {...champ(f, 'texte', '', 'reponse')} />
						<div class="mt-3 flex justify-end">
							<Bouton type="submit" variante="fleuve" chargement={envoi}><Send class="size-4" aria-hidden="true" />Envoyer la réponse</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			{:else}
				<p class="rounded-xl bg-creme p-4 text-ardoise">Ce sujet est clôturé : il n’accepte plus de réponse.</p>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		{#if s.peut_cloturer}
			<section class="carte space-y-3 p-5">
				<h2 class="flex items-center gap-2 text-lg font-bold"><CircleCheck class="size-5 text-foret-600" aria-hidden="true" />Question réglée ?</h2>
				<p class="text-sm text-ardoise">Clôturez le sujet : vous pourrez ensuite en ouvrir un nouveau.</p>
				<Formulaire action="?/cloturer" {form} cle="cloture" confirmer="Clôturer ce sujet ? Il n'acceptera plus de réponse.">
					{#snippet children({ envoi })}
						<Bouton type="submit" variante="secondaire" pleineLargeur chargement={envoi}>Clôturer le sujet</Bouton>
					{/snippet}
				</Formulaire>
			</section>
		{/if}
		<PanneauModeration
			etat={s.etat}
			peutModerer={s.peut_moderer}
			peutModifier={s.peut_modifier && !edition}
			lienModifier="/conseil-financier/{s.id}?modifier=1"
			{form}
			etats={[
				{ value: 1, label: 'En attente' },
				{ value: 2, label: 'Ouvert' },
				{ value: 3, label: 'Supprimé' },
				{ value: 4, label: 'Clôturé' }
			]}
		/>
		{#if wa}
			<section class="carte space-y-3 p-5">
				<h2 class="text-lg font-bold">Besoin d’en parler de vive voix ?</h2>
				<Bouton href={lienWhatsApp(wa, `Bonjour la Frangine, au sujet de ma question ${s.reference}.`)} variante="whatsapp" target="_blank" rel="noopener" pleineLargeur>
					<MessageCircle class="size-5" aria-hidden="true" />Écrire sur WhatsApp
				</Bouton>
			</section>
		{/if}
	</aside>
</div>
