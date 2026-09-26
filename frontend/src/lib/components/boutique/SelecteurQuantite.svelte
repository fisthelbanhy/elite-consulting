<script lang="ts">
	/**
	 * Sélecteur de quantité accessible (− / champ / +). Fonctionne sans JavaScript (simple champ
	 * numérique) ; les boutons déclenchent un évènement `input` pour que le formulaire parent puisse
	 * recalculer ses totaux.
	 */
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';

	let {
		name,
		label,
		valeur = 0,
		max = 999,
		min = 0,
		id
	}: { name: string; label: string; valeur?: number; max?: number; min?: number; id?: string } = $props();

	let champ = $state<HTMLInputElement>();
	const ident = $derived(id ?? `q-${name}`);

	function changer(delta: number) {
		if (!champ) return;
		const v = Math.max(min, Math.min(max, (Number(champ.value) || 0) + delta));
		champ.value = String(v);
		champ.dispatchEvent(new Event('input', { bubbles: true }));
	}
</script>

<div class="flex items-center gap-1">
	<label for={ident} class="sr-only">{label}</label>
	<button
		type="button"
		class="grid size-12 shrink-0 place-items-center rounded-xl text-fleuve-700 ring-1 ring-fleuve-100 ring-inset hover:bg-fleuve-50"
		onclick={() => changer(-1)}
		aria-label="Diminuer — {label}"
	>
		<Minus class="size-4" aria-hidden="true" />
	</button>
	<input
		bind:this={champ}
		id={ident}
		{name}
		type="number"
		inputmode="numeric"
		{min}
		{max}
		value={valeur}
		class="w-16! px-1! text-center"
	/>
	<button
		type="button"
		class="grid size-12 shrink-0 place-items-center rounded-xl text-fleuve-700 ring-1 ring-fleuve-100 ring-inset hover:bg-fleuve-50"
		onclick={() => changer(1)}
		aria-label="Augmenter — {label}"
	>
		<Plus class="size-4" aria-hidden="true" />
	</button>
</div>
