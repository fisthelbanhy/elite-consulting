<script lang="ts">
	/** Calendrier indicatif des tours : à chaque échéance, un adhérent reçoit la cagnotte. */
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import { date, fcfa } from '$lib/format';
	import type { Echeance } from '$lib/types/likelemba';

	let { calendrier, cagnotte }: { calendrier: Echeance[]; cagnotte: number } = $props();
	const prochain = $derived(calendrier.find((e) => !e.passee && e.date));
</script>

{#if calendrier.length}
	<p class="text-[15px] text-ardoise">
		À chaque tour, la cagnotte de <strong class="montant text-encre">{fcfa(cagnotte)}</strong> revient à un membre, dans l'ordre d'entrée.
		Calendrier indicatif, à confirmer avec le responsable.
	</p>
	<ol class="mt-4 space-y-2">
		{#each calendrier as e (e.tour)}
			<li
				class="flex items-center gap-3 rounded-xl p-3 {e === prochain ? 'bg-foret-50 ring-1 ring-foret-600/30' : e.passee ? 'bg-sable/60 text-ardoise' : 'bg-creme'}"
				aria-current={e === prochain ? 'step' : undefined}
			>
				<span class="grid size-9 shrink-0 place-items-center rounded-full bg-white font-display font-bold text-fleuve-700 ring-1 ring-fleuve-100">{e.tour}</span>
				<div class="min-w-0 flex-1">
					<p class="font-semibold">{e.beneficiaire}</p>
					<p class="text-sm">{e.date ? date(e.date) : 'Date à fixer'}{#if e === prochain} · prochain tour{/if}</p>
				</div>
				{#if e.passee}<CircleCheck class="size-5 text-foret-600" aria-label="Tour passé" />{/if}
			</li>
		{/each}
	</ol>
{:else}
	<p class="text-ardoise">Le calendrier s'affichera dès que le groupe aura des membres actifs.</p>
{/if}
