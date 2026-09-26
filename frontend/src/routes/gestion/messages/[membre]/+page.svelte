<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import FilMessages from '$lib/components/messages/FilMessages.svelte';
	import FormulaireMessage from '$lib/components/messages/FormulaireMessage.svelte';
	import Presence from '$lib/components/messages/Presence.svelte';
	import { lienTel, lienWhatsApp, relatif, telephone } from '$lib/format';

	let { data, form } = $props();
	const m = $derived(data.fil.membre);
	const nom = $derived(m.pseudonyme || m.nom);
</script>

<svelte:head>
	<title>Conversation avec {nom} — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur max-w-4xl space-y-6 py-6">
	<a href="/gestion/messages" class="inline-flex min-h-11 items-center gap-2 font-semibold text-fleuve-700 hover:underline">
		<ArrowLeft class="size-5" aria-hidden="true" />Toutes les conversations
	</a>

	<header class="carte flex flex-wrap items-center gap-4 p-4 sm:p-5">
		<Avatar src={m.photo_url} nom={m.nom} taille="lg" />
		<div class="min-w-0 flex-1">
			<h1 class="text-2xl font-bold">{m.nom}</h1>
			<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ardoise">
				{#if m.pseudonyme && m.pseudonyme !== m.nom}<span>{m.pseudonyme}</span>{/if}
				<Presence enLigne={m.en_ligne} libelleHorsLigne={m.derniere_activite ? `Vu·e ${relatif(m.derniere_activite)}` : 'Hors ligne'} />
			</p>
		</div>
		<div class="flex flex-wrap gap-2 text-[15px]">
			{#if m.telephone}
				<a href={lienTel(m.telephone)} class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 hover:bg-fleuve-50">
					<Phone class="size-4" aria-hidden="true" />{telephone(m.telephone)}
				</a>
				<a
					href={lienWhatsApp(m.telephone, `Bonjour ${nom}, c'est votre frangine de ${data.parametres.nom_site}.`)}
					target="_blank"
					rel="noopener"
					class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-foret-700 ring-1 ring-foret-600/40 hover:bg-foret-50"
				>
					<MessageCircle class="size-4" aria-hidden="true" />WhatsApp
				</a>
			{/if}
			{#if m.email}
				<a href="mailto:{m.email}" class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 hover:bg-fleuve-50">
					<Mail class="size-4" aria-hidden="true" />E-mail
				</a>
			{/if}
		</div>
	</header>

	<section class="carte space-y-5 p-4 sm:p-6" aria-label="Conversation avec {nom}">
		{#if data.fil.non_lus}
			<p class="text-sm text-ardoise" role="status">
				{data.fil.non_lus} message{data.fil.non_lus > 1 ? 's' : ''} du membre marqué{data.fil.non_lus > 1 ? 's' : ''} comme lu{data.fil.non_lus > 1 ? 's' : ''}.
			</p>
		{/if}
		<FilMessages messages={data.fil.messages} perspective="frangine" nomMembre={nom}>
			{#snippet vide()}
				<div class="flex flex-col items-center rounded-carte bg-sable/60 px-6 py-10 text-center">
					<MessagesSquare class="mb-3 size-8 text-fleuve-600" aria-hidden="true" />
					<p class="font-semibold text-fleuve-700">Aucun message avec {nom} pour l'instant.</p>
					<p class="mt-1 text-ardoise">Écrivez-lui le premier message : il le verra dans « Mes messages ».</p>
				</div>
			{/snippet}
		</FilMessages>
		<FormulaireMessage {form} label="Votre réponse au nom de la frangine" placeholder="Bonjour {nom}, …" libelleEnvoyer="Répondre" />
	</section>
</div>
