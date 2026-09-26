<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTete from '$lib/components/layout/EnTete.svelte';
	import NavMobile from '$lib/components/layout/NavMobile.svelte';
	import PiedDePage from '$lib/components/layout/PiedDePage.svelte';
	import { lienWhatsApp } from '$lib/format';
	import { messageWhatsAppPour } from '$lib/navigation';

	let { data, children } = $props();

	const gestion = $derived(page.url.pathname.startsWith('/gestion'));
	const wa = $derived(lienWhatsApp(data.parametres.whatsapp, messageWhatsAppPour(page.url.pathname)));
</script>

<svelte:head>
	<title>{data.parametres.nom_site} — la grande sœur de ceux qui se lancent</title>
</svelte:head>

{#if gestion}
	{@render children()}
{:else}
	<EnTete
		membre={data.membre}
		parametres={data.parametres}
		panier={data.compteurs?.panier ?? 0}
		messages={data.compteurs?.messages_non_lus ?? 0}
	/>
	<main id="contenu" tabindex="-1" class="min-h-[60vh] outline-none">
		{@render children()}
	</main>
	<PiedDePage parametres={data.parametres} />
	<NavMobile connecte={!!data.membre} />

	{#if data.parametres.whatsapp}
		<!-- Bouton WhatsApp flottant, message contextuel (ADR-0008) -->
		<a
			href={wa}
			target="_blank"
			rel="noopener"
			class="fixed right-4 bottom-20 z-30 hidden items-center gap-2 rounded-full bg-foret-600 py-3 pr-5 pl-4 font-semibold text-white shadow-levee hover:bg-foret-700 lg:inline-flex"
		>
			<MessageCircle class="size-6" aria-hidden="true" /> Une question ?
		</a>
	{/if}
{/if}
