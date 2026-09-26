<script lang="ts">
	/**
	 * CTA « Recevoir mon plan d'action » (ADR-0008). Connecté : envoi direct à la conseillère
	 * (action `?/enregistrer`). Visiteur : inscription puis enregistrement automatique
	 * (`/diagnostic/enregistrer`), les réponses étant gardées dans un cookie signé.
	 */
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import { lienWhatsApp } from '$lib/format';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string> } | null | undefined;

	let {
		connecte,
		whatsapp,
		resume,
		form
	}: { connecte: boolean; whatsapp: string; resume: string; form?: Retour } = $props();

	const suite = encodeURIComponent('/diagnostic/enregistrer');
	const messageWa = $derived(
		`Bonjour la Frangine, je viens de faire mon diagnostic sur le site. ${resume} Pouvez-vous m'aider à construire mon plan d'action ?`
	);
</script>

<section class="rounded-3xl bg-white p-6 shadow-levee ring-1 ring-fleuve-900/5 sm:p-8" aria-labelledby="titre-plan">
	<h2 id="titre-plan" class="text-2xl font-bold">Et maintenant, votre plan d'action</h2>
	<p class="mt-2 text-lg text-ardoise">
		Une conseillère étudie vos réponses et vous rappelle pour construire avec vous un plan concret : par quoi commencer, avec qui,
		avec quel argent.
	</p>

	{#if connecte}
		<Formulaire action="?/enregistrer" {form} cle="plan" class="mt-6">
			{#snippet children({ envoi })}
				<Bouton type="submit" taille="lg" chargement={envoi} class="w-full sm:w-auto">
					Recevoir mon plan d'action <ArrowRight class="size-5" aria-hidden="true" />
				</Bouton>
			{/snippet}
		</Formulaire>
		<p class="mt-3 text-[15px] text-ardoise">Votre diagnostic est ajouté à votre fiche « Découverte de soi », visible de vous et de la frangine seulement.</p>
	{:else}
		<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
			<Bouton href="/inscription?suite={suite}" taille="lg">Recevoir mon plan d'action <ArrowRight class="size-5" aria-hidden="true" /></Bouton>
			<Bouton href="/connexion?suite={suite}" variante="fantome" taille="lg">J'ai déjà un compte</Bouton>
		</div>
		<p class="mt-3 text-[15px] text-ardoise">Compte gratuit en 1 minute : votre nom et votre téléphone suffisent. Vos réponses sont gardées.</p>
	{/if}

	{#if whatsapp}
		<div class="mt-6 border-t border-fleuve-900/5 pt-5">
			<Bouton href={lienWhatsApp(whatsapp, messageWa)} variante="whatsapp" target="_blank" rel="noopener">
				<MessageCircle class="size-5" aria-hidden="true" />Envoyer mon résumé sur WhatsApp
			</Bouton>
		</div>
	{/if}
</section>
