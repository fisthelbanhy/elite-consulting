<script lang="ts">
	/** Coordonnées publiques d'une entreprise de l'annuaire, avec appel, WhatsApp, e-mail, site. */
	import { page } from '$app/state';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Globe from '@lucide/svelte/icons/globe';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { lienTel, lienWhatsApp, telephone } from '$lib/format';
	import { lienSite, siteLisible } from './outils';
	import type { EntrepriseDetail } from '$lib/types/entreprises';

	let { entreprise: e }: { entreprise: EntrepriseDetail } = $props();
	const site = $derived(lienSite(e.site_web));
	const message = $derived(`Bonjour, j'ai trouvé ${e.nom} dans l'annuaire de ${page.data.parametres?.nom_site ?? 'La Frangine'}. `);
	const waFrangine = $derived(page.data.parametres?.whatsapp as string | undefined);
	const rien = $derived(!e.telephone && !e.email && !site && !e.adresse);
</script>

<section class="carte space-y-4 p-5" aria-labelledby="contact-titre">
	<h2 id="contact-titre" class="text-lg font-bold">Contacter l'entreprise</h2>
	{#if e.telephone}
		<div class="grid gap-2">
			<Bouton href={lienWhatsApp(e.telephone, message)} variante="whatsapp" target="_blank" rel="noopener" pleineLargeur>
				<MessageCircle class="size-5" aria-hidden="true" />Écrire sur WhatsApp
			</Bouton>
			<Bouton href={lienTel(e.telephone)} variante="secondaire" pleineLargeur>
				<Phone class="size-5" aria-hidden="true" />Appeler le {telephone(e.telephone)}
			</Bouton>
		</div>
	{/if}
	<ul class="space-y-2.5 text-[15px]">
		{#if e.email}
			<li class="flex items-start gap-2">
				<Mail class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" />
				<a href="mailto:{e.email}?subject={encodeURIComponent(`Contact via l'annuaire — ${e.nom}`)}" class="lien break-all">{e.email}</a>
			</li>
		{/if}
		{#if site}
			<li class="flex items-start gap-2">
				<Globe class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" />
				<a href={site} target="_blank" rel="nofollow ugc noopener" class="lien break-all">{siteLisible(e.site_web)}</a>
			</li>
		{/if}
		{#if e.adresse || e.ville}
			<li class="flex items-start gap-2">
				<MapPin class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" />
				<span>{[e.adresse, e.ville?.nom].filter(Boolean).join(', ')}</span>
			</li>
		{/if}
	</ul>
	{#if rien}
		<p class="text-[15px] text-ardoise">Cette entreprise n'a pas encore publié ses coordonnées.</p>
		{#if waFrangine}
			<Bouton
				href={lienWhatsApp(waFrangine, `Bonjour la Frangine, je souhaite entrer en contact avec l'entreprise ${e.nom} (${e.reference}).`)}
				variante="whatsapp"
				target="_blank"
				rel="noopener"
				pleineLargeur
			>
				<MessageCircle class="size-5" aria-hidden="true" />Demander une mise en relation
			</Bouton>
		{/if}
	{/if}
</section>
