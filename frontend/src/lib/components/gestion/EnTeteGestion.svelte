<script lang="ts">
	/** En-tête compact des pages de gestion : fil d'Ariane, titre, actions. */
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		titre,
		sousTitre,
		fil = [],
		children,
		bas
	}: {
		titre: string;
		sousTitre?: string;
		fil?: { href: string; label: string }[];
		children?: Snippet;
		bas?: Snippet;
	} = $props();
</script>

<header class="border-b border-fleuve-900/5 bg-white">
	<div class="mx-auto max-w-7xl px-4 py-5 sm:px-6">
		{#if fil.length}
			<nav aria-label="Fil d'Ariane" class="mb-2">
				<ol class="flex flex-wrap items-center gap-1 text-sm text-ardoise">
					<li><a href="/gestion" class="hover:text-fleuve-700">Gestion</a></li>
					{#each fil as f (f.href)}
						<li class="flex items-center gap-1">
							<ChevronRight class="size-3.5" aria-hidden="true" />
							<a href={f.href} class="hover:text-fleuve-700">{f.label}</a>
						</li>
					{/each}
				</ol>
			</nav>
		{/if}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="min-w-0">
				<h1 class="text-2xl leading-tight font-bold sm:text-3xl">{titre}</h1>
				{#if sousTitre}<p class="mt-1 text-ardoise">{sousTitre}</p>{/if}
			</div>
			{#if children}<div class="flex shrink-0 flex-wrap gap-2">{@render children()}</div>{/if}
		</div>
		{@render bas?.()}
	</div>
</header>
