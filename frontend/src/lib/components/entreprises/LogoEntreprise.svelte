<script lang="ts">
	/** Logo d'entreprise (carré arrondi), ou initiales sur fond fleuve s'il n'y en a pas. */
	import { initiales } from '$lib/format';

	let { src, nom, taille = 'md' }: { src?: string | null; nom: string; taille?: 'sm' | 'md' | 'lg' } = $props();
	const tailles = { sm: 'size-10 text-sm', md: 'size-14 text-lg', lg: 'size-20 text-2xl sm:size-24' };
</script>

{#if src}
	<img {src} alt="Logo de {nom}" class="{tailles[taille]} shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-fleuve-900/10" loading="lazy" />
{:else}
	<span
		class="{tailles[taille]} grid shrink-0 place-items-center rounded-xl bg-fleuve-50 font-display font-bold text-fleuve-700 ring-1 ring-fleuve-100"
		aria-hidden="true"
	>
		{initiales(nom) || '?'}
	</span>
{/if}
