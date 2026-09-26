<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		titre,
		sousTitre,
		fil = [],
		surtitre,
		children,
		bas
	}: {
		titre: string;
		sousTitre?: string;
		fil?: { href: string; label: string }[];
		surtitre?: string;
		children?: Snippet;
		bas?: Snippet;
	} = $props();
</script>

<header class="border-b border-fleuve-900/5 bg-white">
	<div class="conteneur py-6 sm:py-8">
		{#if fil.length}
			<nav aria-label="Fil d'Ariane" class="mb-3">
				<ol class="flex flex-wrap items-center gap-1 text-sm text-ardoise">
					<li><a href="/" class="hover:text-fleuve-700">Accueil</a></li>
					{#each fil as f (f.href)}
						<li class="flex items-center gap-1">
							<ChevronRight class="size-3.5" aria-hidden="true" />
							<a href={f.href} class="hover:text-fleuve-700">{f.label}</a>
						</li>
					{/each}
				</ol>
			</nav>
		{/if}
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div class="max-w-3xl">
				{#if surtitre}<p class="mb-1 text-sm font-semibold tracking-wide text-laterite-600 uppercase">{surtitre}</p>{/if}
				<h1 class="text-[clamp(1.75rem,6vw,2.5rem)] leading-tight font-bold">{titre}</h1>
				{#if sousTitre}<p class="mt-2 text-lg text-ardoise">{sousTitre}</p>{/if}
			</div>
			{#if children}<div class="flex shrink-0 flex-wrap gap-2">{@render children()}</div>{/if}
		</div>
		{@render bas?.()}
	</div>
</header>
