<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	type Variante = 'principal' | 'secondaire' | 'fleuve' | 'fantome' | 'whatsapp' | 'danger' | 'clair';

	let {
		variante = 'principal',
		taille = 'md',
		href,
		type = 'button',
		pleineLargeur = false,
		chargement = false,
		disabled = false,
		class: classe = '',
		children,
		...rest
	}: {
		variante?: Variante;
		taille?: 'sm' | 'md' | 'lg';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		pleineLargeur?: boolean;
		chargement?: boolean;
		disabled?: boolean;
		class?: string;
		children?: Snippet;
		[cle: string]: unknown;
	} = $props();

	const variantes: Record<Variante, string> = {
		// Latérite : réservé à l'action principale de l'écran (ADR-0008)
		principal: 'bg-laterite-600 text-white hover:bg-laterite-700 shadow-sm',
		fleuve: 'bg-fleuve-700 text-white hover:bg-fleuve-800 shadow-sm',
		secondaire: 'bg-white text-fleuve-700 ring-1 ring-inset ring-fleuve-200 hover:bg-fleuve-50',
		fantome: 'text-fleuve-700 hover:bg-fleuve-50',
		whatsapp: 'bg-white text-foret-700 ring-1 ring-inset ring-foret-600/40 hover:bg-foret-50',
		danger: 'bg-white text-alerte ring-1 ring-inset ring-alerte/30 hover:bg-alerte-50',
		clair: 'bg-white/10 text-white ring-1 ring-inset ring-white/30 hover:bg-white/20'
	};
	const tailles = {
		sm: 'min-h-10 px-3.5 text-[15px] gap-1.5',
		md: 'min-h-12 px-5 text-base gap-2',
		lg: 'min-h-14 px-7 text-lg gap-2.5'
	};

	const classes = $derived(
		[
			'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
			'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60',
			variantes[variante],
			tailles[taille],
			pleineLargeur ? 'w-full' : '',
			classe
		].join(' ')
	);
</script>

{#if href}
	<a {href} class={classes} aria-disabled={disabled || undefined} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button {type} class={classes} disabled={disabled || chargement} aria-busy={chargement || undefined} {...rest}>
		{#if chargement}<LoaderCircle class="size-5 animate-spin" aria-hidden="true" />{/if}
		{@render children?.()}
	</button>
{/if}
