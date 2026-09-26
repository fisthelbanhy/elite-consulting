<script lang="ts">
	/** Photo d'une annonce (chargement différé) ou illustration neutre quand il n'y en a pas. */
	import type { Component } from 'svelte';
	import ImageIcon from '@lucide/svelte/icons/image';

	let {
		src,
		alt = '',
		icone = ImageIcon,
		ratio = 'aspect-[4/3]',
		class: classe = ''
	}: { src?: string | null; alt?: string; icone?: Component; ratio?: string; class?: string } = $props();
	const Icone = $derived(icone);
</script>

{#if src}
	<img {src} {alt} loading="lazy" decoding="async" class="{ratio} w-full bg-sable object-cover {classe}" />
{:else}
	<div class="{ratio} pagne grid w-full place-items-center bg-sable text-fleuve-300 {classe}" aria-hidden="true">
		<Icone class="size-10" />
	</div>
{/if}
