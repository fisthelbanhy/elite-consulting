<script lang="ts">
	/** État vide transformé en opportunité de contact (ADR-0008 : « Soyez prévenu·e »). */
	import type { Component, Snippet } from 'svelte';
	import { page } from '$app/state';
	import Inbox from '@lucide/svelte/icons/inbox';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { lienWhatsApp } from '$lib/format';

	let {
		titre,
		texte,
		icone = Inbox,
		messageWhatsApp,
		children
	}: {
		titre: string;
		texte?: string;
		icone?: Component;
		messageWhatsApp?: string;
		children?: Snippet;
	} = $props();

	const Icone = $derived(icone);
	const wa = $derived(page.data.parametres?.whatsapp as string | undefined);
</script>

<div class="carte flex flex-col items-center px-6 py-12 text-center">
	<span class="mb-4 grid size-16 place-items-center rounded-full bg-sable text-fleuve-600">
		<Icone class="size-8" aria-hidden="true" />
	</span>
	<h2 class="text-xl font-bold">{titre}</h2>
	{#if texte}<p class="mt-2 max-w-md text-ardoise">{texte}</p>{/if}
	<div class="mt-6 flex flex-wrap justify-center gap-3">
		{@render children?.()}
		{#if messageWhatsApp && wa}
			<a
				href={lienWhatsApp(wa, messageWhatsApp)}
				target="_blank"
				rel="noopener"
				class="inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-semibold text-foret-700 ring-1 ring-foret-600/40 ring-inset hover:bg-foret-50"
			>
				<MessageCircle class="size-5" aria-hidden="true" /> Être prévenu·e sur WhatsApp
			</a>
		{/if}
	</div>
</div>
