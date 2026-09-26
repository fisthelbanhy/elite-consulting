<script lang="ts">
	import { initiales } from '$lib/format';

	let { src, nom, taille = 'md' }: { src?: string | null; nom?: string | null; taille?: 'sm' | 'md' | 'lg' | 'xl' } = $props();
	const tailles = { sm: 'size-8 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-lg', xl: 'size-24 text-2xl' };
</script>

{#if src}
	<img {src} alt={nom ?? ''} class="{tailles[taille]} shrink-0 rounded-full object-cover ring-2 ring-white" loading="lazy" />
{:else}
	<span
		class="{tailles[taille]} grid shrink-0 place-items-center rounded-full bg-fleuve-100 font-display font-bold text-fleuve-700 ring-2 ring-white"
		aria-hidden={nom ? undefined : 'true'}
	>
		{initiales(nom) || '?'}
	</span>
{/if}
