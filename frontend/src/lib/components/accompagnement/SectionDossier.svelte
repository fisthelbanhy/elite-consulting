<script lang="ts">
	/**
	 * Une section repliable du questionnaire : sous-sections legacy affichées en retrait, une zone
	 * de texte par question (champ `z{zone}`). En lecture seule, les réponses sont affichées.
	 */
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Zone from '$lib/components/ui/Zone.svelte';
	import type { Section } from '$lib/types/accompagnement';

	let {
		section: s,
		reponses = $bindable(),
		lecture = false,
		ouvert = false
	}: {
		section: Section;
		reponses: Record<string, string>;
		lecture?: boolean;
		ouvert?: boolean;
	} = $props();

	const zones = $derived(s.groupes.flatMap((g) => g.questions.map((q) => String(q.zone))));
	const remplies = $derived(zones.filter((z) => (reponses[z] ?? '').trim()).length);
	const complete = $derived(remplies === zones.length);
</script>

{#snippet question(zone: number, libelle: string, aide: string)}
	{#if lecture}
		<div>
			<p class="text-[15px] font-semibold text-encre">{libelle}</p>
			<p class="mt-1 whitespace-pre-line {reponses[String(zone)] ? '' : 'text-ardoise'}">{reponses[String(zone)] || '—'}</p>
		</div>
	{:else}
		<Zone label={libelle} name="z{zone}" lignes={3} aide={aide || undefined} maxlength={10000} bind:value={reponses[String(zone)]} />
	{/if}
{/snippet}

<details class="carte group/section overflow-hidden" open={ouvert}>
	<summary class="flex min-h-16 cursor-pointer list-none items-center gap-3 p-5 hover:bg-creme [&::-webkit-details-marker]:hidden">
		<span class="grid size-9 shrink-0 place-items-center rounded-full font-display font-bold {complete ? 'bg-foret-600 text-white' : 'bg-fleuve-50 text-fleuve-700'}">
			{#if complete}<CircleCheck class="size-5" aria-hidden="true" /><span class="sr-only">Complète :</span>{:else}{s.numero}{/if}
		</span>
		<span class="min-w-0 flex-1">
			<span class="block font-display text-lg leading-snug font-bold text-fleuve-800">{s.titre}</span>
			<span class="text-sm text-ardoise">{remplies} / {zones.length} réponse{zones.length > 1 ? 's' : ''}</span>
		</span>
		<ChevronDown class="size-5 shrink-0 text-ardoise transition-transform group-open/section:rotate-180" aria-hidden="true" />
	</summary>
	<div class="space-y-6 border-t border-fleuve-900/5 p-5 sm:p-6">
		{#each s.groupes as g, i (i)}
			{#if g.titre}
				<fieldset class="space-y-5 border-l-4 border-soleil-300 pl-4">
					<legend class="mb-3 font-display font-bold text-fleuve-700">{g.titre}</legend>
					{#each g.questions as q (q.zone)}{@render question(q.zone, q.libelle, q.aide)}{/each}
				</fieldset>
			{:else}
				{#each g.questions as q (q.zone)}{@render question(q.zone, q.libelle, q.aide)}{/each}
			{/if}
		{/each}
	</div>
</details>
