<script lang="ts">
	/**
	 * Étape 10 « Paiement » : après « Envoyer ». Fonds propres → paiement du kit (type 6) ;
	 * crédit → demande transmise à la frangine (ADR-0007 S5c) ; souscription validée → bienvenue.
	 */
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { fcfa, lienWhatsApp } from '$lib/format';
	import type { SouscriptionDetail } from '$lib/types/distributeur';

	let { souscription: s, whatsapp = '', paye = false }: { souscription: SouscriptionDetail; whatsapp?: string; paye?: boolean } = $props();
	const validee = $derived(s.etat === 2 || s.etat === 4);
</script>

<div class="space-y-5">
	{#if paye}
		<Alerte type="succes" titre="Adhésion effectuée.">Votre paiement est enregistré : notre caisse le confirme après vérification.</Alerte>
	{/if}

	{#if validee}
		<div class="flex gap-4 rounded-xl bg-foret-50 p-5">
			<PartyPopper class="size-8 shrink-0 text-foret-600" aria-hidden="true" />
			<div class="space-y-1">
				<p class="text-xl font-bold text-foret-700">Bienvenue parmi les distributeurs !</p>
				<p>Votre souscription {s.reference} est validée : le prix distributeur s'applique désormais à tous vos achats.</p>
				{#if s.etat_paiement === 2}<p class="text-sm text-ardoise">Paiement en attente de confirmation par notre caisse.</p>
				{:else if s.etat_paiement === 3}<p class="text-sm text-ardoise">Paiement confirmé.</p>{/if}
			</div>
		</div>
		<div class="flex flex-wrap gap-3">
			<Bouton href="/boutique">Commander au prix distributeur</Bouton>
			<Bouton href="/devenir-distributeur/adhesion?etape=4" variante="secondaire">Compléter ma liste de noms</Bouton>
		</div>
	{:else if s.mode_souscription === 2}
		<div class="flex gap-4 rounded-xl bg-fleuve-50 p-5 text-fleuve-800">
			<Hourglass class="size-8 shrink-0" aria-hidden="true" />
			<div class="space-y-1">
				<p class="text-xl font-bold">Demande de souscription à crédit transmise</p>
				<p>
					Votre frangine étudie votre demande ({s.reference}, kit de <span class="montant">{fcfa(s.montant)}</span>) et vous
					recontacte très vite pour convenir des modalités.
				</p>
			</div>
		</div>
		{#if whatsapp}
			<Bouton
				href={lienWhatsApp(whatsapp, `Bonjour la Frangine, je viens d'envoyer ma souscription distributeur à crédit (${s.reference}).`)}
				variante="whatsapp"
				target="_blank"
				rel="noopener"
			>
				<MessageCircle class="size-5" aria-hidden="true" />En parler sur WhatsApp
			</Bouton>
		{/if}
	{:else}
		{#if s.etat_paiement === 1}
			<Alerte type="attention" titre="Votre précédent paiement n'a pas été confirmé par la caisse.">Vous pouvez le déclarer à nouveau.</Alerte>
		{/if}
		<div class="rounded-xl bg-creme p-5">
			<p class="text-sm text-ardoise">Souscription {s.reference} · fonds propres</p>
			<ul class="mt-3 space-y-1 text-[15px]">
				{#each s.kit as l (l.produit_id)}
					<li class="flex justify-between gap-3"><span>{l.quantite} × {l.nom}</span><span class="montant">{fcfa(l.montant)}</span></li>
				{/each}
			</ul>
			<p class="mt-3 flex items-baseline justify-between border-t border-fleuve-900/10 pt-3">
				<span class="font-semibold">Montant du kit</span>
				<strong class="montant font-display text-2xl text-laterite-700">{fcfa(s.montant)}</strong>
			</p>
		</div>
		<Bouton href="/paiement/6?objet={s.id}" taille="lg" pleineLargeur>Payer mon kit de {fcfa(s.montant)}</Bouton>
		<p class="text-sm text-ardoise">Mobile Money, espèces à notre bureau ou Charden Farell. Vous pouvez encore modifier votre kit à l'étape « Commande ».</p>
	{/if}
</div>
