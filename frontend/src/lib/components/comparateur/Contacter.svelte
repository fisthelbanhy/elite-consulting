<script lang="ts">
	/** Bouton « Contacter » d'une ligne du comparateur : WhatsApp et/ou e-mail de l'entreprise. */
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Mail from '@lucide/svelte/icons/mail';
	import { fcfa, lienWhatsApp } from '$lib/format';
	import type { LigneComparee } from '$lib/types/comparateur';

	let { ligne: l }: { ligne: LigneComparee } = $props();
	const sujet = $derived(l.offre_ou_demande === 1 ? `Votre offre : ${l.produit.nom}` : `Votre demande : ${l.produit.nom}`);
	const message = $derived(
		`Bonjour ${l.entreprise.nom}, je vous contacte depuis le comparateur de prix de La Frangine au sujet de ${
			l.offre_ou_demande === 1 ? 'votre offre' : 'votre demande'
		} « ${l.produit.nom} » (${fcfa(l.prix)} / ${l.unite_vente}).`
	);
</script>

<div class="flex flex-wrap gap-2">
	{#if l.entreprise.telephone}
		<a
			href={lienWhatsApp(l.entreprise.telephone, message)}
			target="_blank"
			rel="noopener"
			class="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[15px] font-semibold text-foret-700 ring-1 ring-foret-600/40 ring-inset hover:bg-foret-50"
		>
			<MessageCircle class="size-4" aria-hidden="true" />WhatsApp<span class="sr-only"> : {l.entreprise.nom}</span>
		</a>
	{/if}
	{#if l.entreprise.email}
		<a
			href="mailto:{l.entreprise.email}?subject={encodeURIComponent(sujet)}&body={encodeURIComponent(message)}"
			class="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[15px] font-semibold text-fleuve-700 ring-1 ring-fleuve-200 ring-inset hover:bg-fleuve-50"
		>
			<Mail class="size-4" aria-hidden="true" />E-mail<span class="sr-only"> : {l.entreprise.nom}</span>
		</a>
	{/if}
	{#if !l.entreprise.telephone && !l.entreprise.email}
		<a href="/entreprises/{l.entreprise.id}" class="lien text-[15px]">Voir la fiche</a>
	{/if}
</div>
