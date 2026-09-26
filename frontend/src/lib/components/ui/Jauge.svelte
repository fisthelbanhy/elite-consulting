<script lang="ts">
	import { pourcentage } from '$lib/format';

	let {
		valeur,
		max,
		label,
		couleur = 'foret'
	}: { valeur: number; max: number; label?: string; couleur?: 'foret' | 'laterite' | 'fleuve' | 'soleil' } = $props();

	const pct = $derived(pourcentage(valeur, max));
	const couleurs = { foret: 'bg-foret-600', laterite: 'bg-laterite-600', fleuve: 'bg-fleuve-700', soleil: 'bg-soleil-400' };
</script>

<div>
	<div
		class="h-2.5 overflow-hidden rounded-full bg-sable"
		role="progressbar"
		aria-valuenow={pct}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={label ?? 'Progression'}
	>
		<div class="h-full rounded-full {couleurs[couleur]} transition-[width]" style="width: {pct}%"></div>
	</div>
</div>
