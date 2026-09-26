<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Phone from '@lucide/svelte/icons/phone';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Restitution from '$lib/components/diagnostic/Restitution.svelte';
	import { telephone } from '$lib/format';

	let { data } = $props();
	const d = $derived(data.diagnostic);
	const tel = $derived(data.membre?.telephone ?? '');
</script>

<svelte:head>
	<title>Diagnostic envoyé — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur max-w-4xl space-y-10 py-8 sm:py-12">
	<section class="rounded-3xl bg-foret-50 p-6 ring-1 ring-foret-100 sm:p-8" aria-labelledby="titre-merci">
		<CircleCheck class="size-12 text-foret-600" aria-hidden="true" />
		<h1 id="titre-merci" class="mt-3 text-[clamp(1.75rem,6vw,2.5rem)] leading-tight font-bold text-foret-700">C'est envoyé à votre conseillère !</h1>
		<p class="mt-3 max-w-2xl text-lg text-encre">
			Elle étudie votre diagnostic et vous rappelle très vite pour construire votre plan d'action.
			{#if tel}Vérifiez que vous êtes joignable au <strong class="whitespace-nowrap">{telephone(tel)}</strong>.{/if}
		</p>
		<ol class="mt-6 grid gap-3 sm:grid-cols-3">
			<li class="flex gap-3 rounded-2xl bg-white p-4"><Phone class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" /><span>Votre conseillère vous appelle ou vous écrit sur WhatsApp.</span></li>
			<li class="flex gap-3 rounded-2xl bg-white p-4"><ClipboardPenLine class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" /><span>En attendant, complétez votre bilan « Découverte de soi ».</span></li>
			<li class="flex gap-3 rounded-2xl bg-white p-4"><MessageCircle class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" /><span>Ses réponses arrivent dans votre messagerie.</span></li>
		</ol>
		<div class="mt-6 flex flex-col gap-3 sm:flex-row">
			<Bouton href="/decouverte-de-soi" taille="lg">Compléter ma Découverte de soi</Bouton>
			<Bouton href="/espace/messages" variante="secondaire" taille="lg">Ma messagerie</Bouton>
		</div>
		{#if !tel}
			<p class="mt-4 text-[15px]"><a href="/espace/profil" class="lien">Ajoutez votre numéro de téléphone</a> pour que votre conseillère puisse vous rappeler.</p>
		{/if}
	</section>

	<Restitution restitution={d} />
</div>
