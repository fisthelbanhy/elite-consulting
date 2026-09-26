<script lang="ts">
	/** Logo : le cercle (Likelemba, communauté) aux couleurs fleuve, latérite, forêt et soleil. */
	let { clair = false, compact = false }: { clair?: boolean; compact?: boolean } = $props();
</script>

<span class="inline-flex items-center gap-2.5">
	<svg viewBox="0 0 40 40" class="size-9 shrink-0" aria-hidden="true">
		<circle cx="20" cy="20" r="15" fill="none" stroke="#1F3D63" stroke-width="5" stroke-dasharray="22 2.6" transform="rotate(-90 20 20)" class={clair ? 'stroke-white' : ''} />
		<circle cx="20" cy="20" r="15" fill="none" stroke="#C2410C" stroke-width="5" stroke-dasharray="0 24.6 21.6 48.8" transform="rotate(-90 20 20)" />
		<circle cx="20" cy="20" r="15" fill="none" stroke="#1E7A5A" stroke-width="5" stroke-dasharray="0 49.2 21.6 24.2" transform="rotate(-90 20 20)" />
		<circle cx="20" cy="20" r="6" fill="#F2B632" />
	</svg>
	{#if !compact}
		<span class="font-display text-[1.35rem] leading-none font-extrabold tracking-tight {clair ? 'text-white' : 'text-fleuve-700'}">
			La&nbsp;Frangine
		</span>
	{/if}
</span>
