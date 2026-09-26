<script lang="ts">
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import FormulaireDossier from '$lib/components/accompagnement/FormulaireDossier.svelte';
	import { date, lienTel, lienWhatsApp, telephone } from '$lib/format';
	import { ETATS_DOSSIER } from '$lib/types/accompagnement';

	let { data, form } = $props();
	const d = $derived(data.dossier);
	const q = $derived(data.questionnaire);
	const wa = $derived(data.parametres.whatsapp);
</script>

<svelte:head>
	<title>Dossier {d.reference} — {q.libelle} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={q.libelle}
	sousTitre="Dossier {d.reference} · créé le {date(d.date_creation)}"
	fil={[{ href: '/accompagnement', label: 'Accompagnement' }, { href: `/accompagnement/${q.slug}`, label: q.libelle }]}
>
	<BadgeEtat etat={d.etat} libelles={ETATS_DOSSIER} />
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="min-w-0 space-y-6">
		{#if data.statut === 'envoye'}
			<Alerte type="succes" titre="Votre dossier est envoyé à votre conseiller.">Il le relit et revient vers vous. Vous pouvez encore le compléter à tout moment.</Alerte>
		{:else if data.statut === 'sauvegarde'}
			<Alerte type="succes" titre="Votre dossier est sauvegardé.">Complétez-le à votre rythme, puis envoyez-le à votre conseiller.</Alerte>
		{/if}
		{#if d.etat === 4 && !d.peut_modifier}
			<Alerte type="info" titre="Votre conseiller a traité ce dossier.">Pour le modifier, écrivez-lui : il le rouvrira.</Alerte>
		{/if}
		<FormulaireDossier questionnaire={q} {form} initial={d} lecture={!d.peut_modifier} />
	</div>

	<aside class="space-y-6">
		{#if d.contact}
			<section class="carte space-y-2 p-5">
				<h2 class="text-lg font-bold">Membre</h2>
				<p class="font-semibold">{d.contact.nom} <span class="font-normal text-ardoise">({d.contact.pseudonyme})</span></p>
				{#if d.contact.telephone}
					<p class="flex flex-wrap gap-3">
						<a href={lienTel(d.contact.telephone)} class="lien inline-flex items-center gap-1"><Phone class="size-4" aria-hidden="true" />{telephone(d.contact.telephone)}</a>
						<a href={lienWhatsApp(d.contact.telephone, `Bonjour, je suis votre conseiller La Frangine pour le dossier ${d.reference}.`)} target="_blank" rel="noopener" class="font-semibold text-foret-700">WhatsApp</a>
					</p>
				{/if}
				{#if d.contact.email}<p><a href="mailto:{d.contact.email}" class="lien inline-flex items-center gap-1"><Mail class="size-4" aria-hidden="true" />{d.contact.email}</a></p>{/if}
			</section>
		{/if}
		<PanneauModeration
			etat={d.etat}
			peutModerer={d.peut_moderer}
			peutModifier={d.peut_modifier}
			{form}
			etats={Object.entries(ETATS_DOSSIER).map(([v, l]) => ({ value: Number(v), label: l }))}
		/>
		{#if !d.contact && wa}
			<section class="carte space-y-3 p-5">
				<h2 class="text-lg font-bold">Une question sur une rubrique ?</h2>
				<p class="text-sm text-ardoise">Votre conseiller vous aide à trouver les bons chiffres.</p>
				<Bouton href={lienWhatsApp(wa, `Bonjour la Frangine, j’ai une question sur mon dossier ${d.reference}.`)} variante="whatsapp" target="_blank" rel="noopener" pleineLargeur>
					<MessageCircle class="size-5" aria-hidden="true" />Écrire sur WhatsApp
				</Bouton>
			</section>
		{/if}
	</aside>
</div>
