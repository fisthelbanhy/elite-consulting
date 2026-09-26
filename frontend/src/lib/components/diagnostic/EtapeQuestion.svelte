<script lang="ts">
	/**
	 * Un écran du diagnostic : une question, de gros boutons de réponse. Chaque bouton envoie
	 * directement la réponse (`name = clé`, `value = code`) : un seul geste, et cela fonctionne
	 * aussi sans JavaScript.
	 */
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import type { QuestionDiagnostic } from '$lib/types/decouverte';

	type Retour = { message?: string; champs?: Record<string, string> } | null | undefined;

	let {
		question: q,
		etape,
		reponse,
		form
	}: { question: QuestionDiagnostic; etape: number; reponse: string; form?: Retour } = $props();

	const colonnes = $derived(q.options.length > 5 ? 'sm:grid-cols-2' : '');
</script>

<Formulaire action="?/repondre" {form}>
	{#snippet children({ envoi })}
		<input type="hidden" name="etape" value={etape} />
		<fieldset aria-describedby={q.aide ? 'aide-question' : undefined} disabled={envoi}>
			<legend class="block">
				<h1 class="text-[clamp(1.6rem,6vw,2.4rem)] leading-tight font-bold">{q.question}</h1>
			</legend>
			{#if q.aide}<p id="aide-question" class="mt-2 text-lg text-ardoise">{q.aide}</p>{/if}
			<div class="mt-6 grid gap-3 {colonnes}">
				{#each q.options as o (o.code)}
					{@const choisie = o.code === reponse}
					<button
						type="submit"
						name={q.cle}
						value={o.code}
						class="group flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 bg-white px-5 py-4 text-left transition-colors hover:border-fleuve-700 hover:bg-fleuve-50 focus-visible:border-fleuve-700 disabled:opacity-60 {choisie
							? 'border-fleuve-700 bg-fleuve-50'
							: 'border-fleuve-100'}"
					>
						<span class="min-w-0 flex-1">
							<span class="block text-lg font-semibold text-encre">{o.libelle}</span>
							{#if o.description}<span class="mt-0.5 block text-[15px] text-ardoise">{o.description}</span>{/if}
						</span>
						{#if choisie}
							<Check class="size-6 shrink-0 text-fleuve-700" aria-hidden="true" /><span class="sr-only">(votre réponse actuelle)</span>
						{:else}
							<ChevronRight class="size-6 shrink-0 text-fleuve-300 group-hover:text-fleuve-700" aria-hidden="true" />
						{/if}
					</button>
				{/each}
			</div>
		</fieldset>
	{/snippet}
</Formulaire>
