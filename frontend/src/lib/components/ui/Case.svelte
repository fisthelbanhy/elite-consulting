<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		name,
		checked = $bindable(false),
		erreur,
		children,
		...rest
	}: { name: string; checked?: boolean; erreur?: string; children: Snippet; [cle: string]: unknown } = $props();
</script>

<div>
	<label class="flex cursor-pointer items-start gap-3 py-1">
		<input type="checkbox" {name} bind:checked aria-invalid={erreur ? 'true' : undefined} class="mt-0.5 shrink-0" {...rest} />
		<span class="text-[15px] leading-snug text-encre">{@render children()}</span>
	</label>
	{#if erreur}<p class="mt-1 text-sm font-medium text-alerte">{erreur}</p>{/if}
</div>
