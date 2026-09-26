<script lang="ts">
	/** Appel à devenir annonceur : formulaire de contact prérempli + WhatsApp. */
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Check from '@lucide/svelte/icons/check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { lienWhatsApp } from '$lib/format';

	let { whatsapp = '', nomSite = 'La Frangine' }: { whatsapp?: string; nomSite?: string } = $props();

	const atouts = [
		'Une audience d’entrepreneurs, de commerçantes et de porteurs de projet',
		'Image, son ou vidéo, diffusés sur les pages les plus consultées',
		'Le nombre de vues de votre annonce, suivi pour vous'
	];
</script>

<section id="devenir-annonceur" class="pagne scroll-mt-24 rounded-carte bg-fleuve-800 p-6 text-white sm:p-8" aria-labelledby="titre-annonceur">
	<div class="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
		<div>
			<p class="flex items-center gap-2 text-sm font-semibold tracking-wide text-soleil-300 uppercase">
				<Megaphone class="size-4" aria-hidden="true" />Annonceurs
			</p>
			<h2 id="titre-annonceur" class="mt-1 text-2xl font-bold text-white">Faites connaître votre activité sur {nomSite}</h2>
			<ul class="mt-4 space-y-2 text-[15px] text-fleuve-100">
				{#each atouts as a (a)}
					<li class="flex items-start gap-2"><Check class="mt-0.5 size-5 shrink-0 text-soleil-300" aria-hidden="true" />{a}</li>
				{/each}
			</ul>
		</div>
		<div class="flex flex-col gap-3 sm:flex-row md:flex-col">
			<Bouton href="/contact?objet={encodeURIComponent('Devenir annonceur')}">Demander une publicité</Bouton>
			{#if whatsapp}
				<Bouton
					href={lienWhatsApp(whatsapp, `Bonjour la Frangine, je souhaite faire une publicité sur ${nomSite}.`)}
					variante="clair"
					target="_blank"
					rel="noopener"
				>
					<MessageCircle class="size-5" aria-hidden="true" />En parler sur WhatsApp
				</Bouton>
			{/if}
		</div>
	</div>
</section>
