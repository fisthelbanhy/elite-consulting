<script lang="ts">
	/**
	 * Formulaire en amélioration progressive (fonctionne sans JavaScript).
	 * Affiche le récapitulatif d'erreurs / le message de succès renvoyés par l'action.
	 * `cle` : sur une page à plusieurs formulaires, n'affiche que le retour de cette action.
	 */
	import type { Snippet } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import Alerte from './Alerte.svelte';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string } | null | undefined;

	let {
		action = '',
		form,
		cle,
		fichiers = false,
		reinitialiser = false,
		confirmer,
		onsucces,
		class: classe = '',
		id,
		children
	}: {
		action?: string;
		form?: Retour;
		cle?: string;
		fichiers?: boolean;
		reinitialiser?: boolean;
		confirmer?: string;
		onsucces?: (data: Record<string, unknown> | undefined) => void;
		class?: string;
		id?: string;
		children: Snippet<[{ envoi: boolean }]>;
	} = $props();

	let envoi = $state(false);
	let alerte = $state<HTMLDivElement>();
	const retour = $derived(form && (!cle || form.cle === cle) ? form : null);

	const soumettre: SubmitFunction = ({ cancel }) => {
		if (confirmer && !confirm(confirmer)) {
			cancel();
			return;
		}
		envoi = true;
		return async ({ result, update }) => {
			await update({ reset: reinitialiser && result.type === 'success' });
			envoi = false;
			if (result.type === 'success') onsucces?.(result.data as Record<string, unknown> | undefined);
			if (result.type === 'failure') {
				await tick();
				alerte?.querySelector<HTMLElement>('[role=alert]')?.focus();
			}
		};
	};
</script>

<form
	method="POST"
	{action}
	{id}
	enctype={fichiers ? 'multipart/form-data' : undefined}
	use:enhance={soumettre}
	class={classe}
>
	<div bind:this={alerte}>
		{#if retour?.message && !retour?.succes}
			<Alerte type="erreur" titre={retour.message} champs={retour.champs} class="mb-6" />
		{:else if retour?.succes}
			<Alerte type="succes" titre={retour.succes} class="mb-6" />
		{/if}
	</div>
	{@render children({ envoi })}
</form>
