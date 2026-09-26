<script lang="ts">
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import FilMessages from '$lib/components/messages/FilMessages.svelte';
	import FormulaireMessage from '$lib/components/messages/FormulaireMessage.svelte';
	import Presence from '$lib/components/messages/Presence.svelte';
	import { lienWhatsApp } from '$lib/format';

	let { data, form } = $props();
	const fil = $derived(data.fil);
</script>

<svelte:head>
	<title>Mes messages — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Mes messages"
	surtitre="Mon espace"
	sousTitre="Une question, un doute, une bonne nouvelle ? Écrivez à votre frangine : une vraie personne vous répond."
	fil={[{ href: '/espace', label: 'Mon espace' }, { href: '/espace/messages', label: 'Messages' }]}
/>

<div class="conteneur max-w-3xl space-y-6 py-8">
	<section class="carte space-y-5 p-4 sm:p-6" aria-labelledby="titre-conversation">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<Avatar nom="La Frangine" taille="md" />
				<div>
					<h2 id="titre-conversation" class="text-lg font-bold">Votre frangine</h2>
					<Presence
						enLigne={fil.frangine_en_ligne}
						libelleEnLigne="En ligne : elle peut vous répondre maintenant"
						libelleHorsLigne="Absente pour le moment : elle vous répond dès son retour"
					/>
				</div>
			</div>
			{#if fil.non_lus}
				<p class="rounded-full bg-soleil-100 px-3 py-1 text-sm font-semibold" role="status">
					{fil.non_lus} nouveau{fil.non_lus > 1 ? 'x' : ''} message{fil.non_lus > 1 ? 's' : ''}
				</p>
			{/if}
		</div>

		<FilMessages messages={fil.messages} perspective="membre">
			{#snippet vide()}
				<div class="flex flex-col items-center rounded-carte bg-sable/60 px-6 py-10 text-center">
					<span class="mb-3 grid size-14 place-items-center rounded-full bg-white text-fleuve-600">
						<MessagesSquare class="size-7" aria-hidden="true" />
					</span>
					<p class="font-display text-lg font-bold text-fleuve-700">Commencez la conversation</p>
					<p class="mt-1 max-w-md text-ardoise">
						Présentez-vous en quelques mots et dites-nous où vous en êtes : votre idée, votre activité, votre besoin. Votre frangine vous
						oriente.
					</p>
				</div>
			{/snippet}
		</FilMessages>

		<FormulaireMessage {form} placeholder="Bonjour la frangine, …" />
	</section>

	<div class="grid gap-4 sm:grid-cols-2">
		<p class="flex items-start gap-3 rounded-carte bg-white p-4 text-[15px] ring-1 ring-fleuve-900/5">
			<Lock class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />
			<span>Vos messages sont privés : seule l'équipe de {data.parametres.nom_site} peut les lire.</span>
		</p>
		{#if data.parametres.whatsapp}
			<a
				href={lienWhatsApp(data.parametres.whatsapp, "Bonjour la Frangine, je vous ai écrit dans la messagerie du site.")}
				target="_blank"
				rel="noopener"
				class="flex items-start gap-3 rounded-carte bg-white p-4 text-[15px] ring-1 ring-foret-600/30 hover:bg-foret-50"
			>
				<MessageCircle class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />
				<span><strong class="text-foret-700">Urgent ?</strong> Écrivez-nous aussi sur WhatsApp.</span>
			</a>
		{/if}
	</div>
</div>
