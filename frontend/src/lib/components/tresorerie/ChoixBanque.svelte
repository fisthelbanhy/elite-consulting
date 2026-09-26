<script lang="ts">
	/**
	 * Banque du référentiel ou « Autre banque (non listée) » + nom libre (règle legacy S7-10 :
	 * la banque « Autres » sert de valeur sentinelle). Sans JavaScript, le champ libre reste visible.
	 */
	import Liste from '$lib/components/ui/Liste.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import type { BanqueCourte } from '$lib/types/tresorerie';

	let {
		label,
		name,
		nomLibre,
		banques,
		valeur = '',
		valeurLibre = '',
		erreur,
		requis = false,
		aide
	}: {
		label: string;
		name: string;
		nomLibre: string;
		banques: BanqueCourte[];
		valeur?: string | number | null;
		valeurLibre?: string;
		erreur?: string;
		requis?: boolean;
		aide?: string;
	} = $props();

	const initial = () => (valeur !== null && valeur !== undefined && valeur !== '' ? String(valeur) : valeurLibre ? 'autre' : '');
	let choix = $state(initial());
	let monte = $state(false);
	$effect(() => {
		monte = true;
	});
	const options = $derived([
		...banques.map((b) => ({ value: b.id, label: b.sigle && b.sigle !== b.nom ? `${b.nom} (${b.sigle})` : b.nom })),
		{ value: 'autre', label: 'Autre banque (non listée)' }
	]);
</script>

<div class="space-y-3">
	<Liste {label} {name} {options} bind:value={choix} {erreur} {requis} {aide} vide="Choisir la banque…" />
	{#if !monte || choix === 'autre'}
		<Saisie label="Nom de la banque (si non listée)" name={nomLibre} value={valeurLibre} maxlength={130} autocomplete="off" />
	{/if}
</div>
