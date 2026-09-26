<script lang="ts">
	/** Une question du questionnaire Découverte de soi, selon son genre. */
	import Zone from '$lib/components/ui/Zone.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import type { QuestionFiche } from './questions';

	let { question: q, valeur, erreur }: { question: QuestionFiche; valeur: unknown; erreur?: string } = $props();

	const libelle = $derived(`${q.numero}. ${q.libelle}`);
	const choix = $derived(q.choix ?? ['Oui', 'Non']);
	const courant = $derived(valeur === 1 || valeur === 2 || valeur === '1' || valeur === '2' ? String(valeur) : '');
</script>

{#if q.genre === 'ouinon'}
	<Choix
		legende={libelle}
		name={q.champ}
		value={courant}
		{erreur}
		options={[
			{ value: '1', label: choix[0] },
			{ value: '2', label: choix[1] }
		]}
	/>
{:else if q.genre === 'pourcentage'}
	<Saisie
		label={libelle}
		name={q.champ}
		type="number"
		inputmode="numeric"
		min="0"
		max="100"
		step="1"
		suffixe="%"
		class="max-w-60"
		aide={q.aide}
		value={valeur === null || valeur === undefined ? '' : (valeur as number | string)}
		{erreur}
	/>
{:else}
	<Zone
		label={libelle}
		name={q.champ}
		lignes={3}
		aide={q.aide}
		maxlength={5000}
		value={(valeur as string | null | undefined) ?? ''}
		{erreur}
	/>
{/if}
