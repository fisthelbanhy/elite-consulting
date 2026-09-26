<script lang="ts">
	/** Sommaire d'un questionnaire : sections, sous-sections et nombre de questions. */
	import type { Questionnaire } from '$lib/types/accompagnement';

	let { questionnaire: q, details = false }: { questionnaire: Questionnaire; details?: boolean } = $props();
	const nb = (s: Questionnaire['sections'][number]) => s.groupes.reduce((n, g) => n + g.questions.length, 0);
</script>

<ol class="space-y-3">
	{#each q.sections as s (s.numero)}
		<li class="flex gap-3">
			<span class="grid size-8 shrink-0 place-items-center rounded-full bg-fleuve-50 font-display font-bold text-fleuve-700">{s.numero}</span>
			<div class="min-w-0">
				<p class="font-semibold text-encre">{s.titre} <span class="font-normal text-ardoise">· {nb(s)} question{nb(s) > 1 ? 's' : ''}</span></p>
				{#if details}
					{@const sous = s.groupes.filter((g) => g.titre)}
					{#if sous.length}<p class="text-sm text-ardoise">{sous.map((g) => g.titre).join(' · ')}</p>{/if}
				{/if}
			</div>
		</li>
	{/each}
</ol>
