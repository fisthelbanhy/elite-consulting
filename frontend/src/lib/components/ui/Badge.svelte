<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		ton = 'neutre',
		children,
		class: classe = ''
	}: {
		ton?: 'neutre' | 'fleuve' | 'foret' | 'laterite' | 'soleil' | 'alerte';
		children: Snippet;
		class?: string;
	} = $props();

	const tons = {
		neutre: 'bg-sable text-ardoise',
		fleuve: 'bg-fleuve-50 text-fleuve-700',
		foret: 'bg-foret-50 text-foret-700',
		laterite: 'bg-laterite-50 text-laterite-700',
		soleil: 'bg-soleil-100 text-encre',
		alerte: 'bg-alerte-50 text-alerte'
	};
</script>

<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold {tons[ton]} {classe}">
	{@render children()}
</span>
