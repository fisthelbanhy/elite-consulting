<script lang="ts">
	/**
	 * Encadré « Présentation de besoin » / « Intéressement » (action `?/interet`). Visiteur : invitation
	 * à créer son compte + contact WhatsApp de la frangine ; membre : formulaire (5 caractères minimum).
	 */
	import { page } from '$app/state';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import { champ } from '$lib/forms';
	import { lienWhatsApp } from '$lib/format';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string; valeurs?: Record<string, unknown> } | null | undefined;

	let {
		titre,
		texte,
		libelle,
		placeholder,
		bouton,
		deja = false,
		form,
		messageWhatsApp
	}: {
		titre: string;
		texte?: string;
		libelle: string;
		placeholder?: string;
		bouton: string;
		deja?: boolean;
		form: Retour;
		messageWhatsApp: string;
	} = $props();

	const connecte = $derived(!!page.data.membre);
	const retour = $derived(form?.cle === 'interet' ? form : null);
	const wa = $derived(page.data.parametres?.whatsapp as string | undefined);
	const suite = $derived(encodeURIComponent(page.url.pathname));
</script>

<section class="carte p-5" id="interet">
	<h2 class="text-lg font-bold">{titre}</h2>
	{#if texte}<p class="mt-1 text-[15px] text-ardoise">{texte}</p>{/if}
	{#if !connecte}
		<p class="mt-2 text-[15px] text-ardoise">Créez votre compte gratuit pour laisser votre message : la frangine le transmet à l'annonceur.</p>
		<div class="mt-4 space-y-2">
			<Bouton href="/inscription?suite={suite}" pleineLargeur>Créer mon compte gratuit</Bouton>
			<Bouton href="/connexion?suite={suite}" variante="fantome" pleineLargeur>J'ai déjà un compte</Bouton>
		</div>
	{:else if deja || retour?.succes}
		<Alerte type="succes" titre={retour?.succes ?? 'Vous vous êtes déjà manifesté·e sur cette annonce.'} class="mt-3">
			L'annonceur a été prévenu : il vous recontacte par l'intermédiaire de la frangine.
		</Alerte>
	{:else}
		<Formulaire action="?/interet" {form} cle="interet" class="mt-3">
			{#snippet children({ envoi })}
				<Zone label={libelle} lignes={4} requis minlength={5} {placeholder} {...champ(form, 'message', '', 'interet')} />
				<Bouton type="submit" pleineLargeur chargement={envoi} class="mt-4">{bouton}</Bouton>
			{/snippet}
		</Formulaire>
	{/if}
	{#if wa}
		<a
			href={lienWhatsApp(wa, messageWhatsApp)}
			target="_blank"
			rel="noopener"
			class="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl font-semibold text-foret-700 ring-1 ring-foret-600/40 ring-inset hover:bg-foret-50"
		>
			<MessageCircle class="size-5" aria-hidden="true" />Une question ? Écrire à la frangine
		</a>
	{/if}
</section>
