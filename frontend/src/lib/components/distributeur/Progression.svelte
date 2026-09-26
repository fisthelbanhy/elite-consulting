<script lang="ts">
	/** Barre de progression des 10 étapes ; les étapes déjà atteintes sont cliquables (reprise). */
	import Check from '@lucide/svelte/icons/check';
	import { ETAPES } from './contenus';

	let { etape, atteinte }: { etape: number; atteinte: number } = $props();
	const courante = $derived(ETAPES.find((e) => e.numero === etape) ?? ETAPES[0]);
	const pct = $derived(Math.round(((Math.min(atteinte, 10) - 1) / 9) * 100));
</script>

<nav aria-label="Étapes de l'adhésion" class="space-y-3">
	<div class="flex items-baseline justify-between gap-3">
		<p class="font-semibold">Étape {etape} sur 10 <span class="font-normal text-ardoise">· {courante.court}</span></p>
		<p class="text-sm text-ardoise">{pct} % parcouru</p>
	</div>
	<div class="h-2 overflow-hidden rounded-full bg-fleuve-100" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct} aria-label="Progression de l'adhésion">
		<div class="h-full rounded-full bg-foret-600 transition-[width]" style="width: {pct}%"></div>
	</div>
	<ol class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
		{#each ETAPES as e (e.numero)}
			{@const accessible = e.numero <= atteinte}
			{@const faite = e.numero < atteinte}
			<li class="shrink-0">
				{#if accessible && e.numero !== etape}
					<a
						href="?etape={e.numero}"
						class="flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-fleuve-700 ring-1 ring-fleuve-100 hover:bg-fleuve-50"
					>
						{#if faite}<Check class="size-4 text-foret-600" aria-hidden="true" />{:else}<span aria-hidden="true">{e.numero}</span>{/if}
						{e.court}<span class="sr-only">{faite ? ' (faite)' : ''}</span>
					</a>
				{:else}
					<span
						aria-current={e.numero === etape ? 'step' : undefined}
						class="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold {e.numero === etape ? 'bg-fleuve-700 text-white' : 'bg-sable/60 text-ardoise'}"
					>
						<span aria-hidden="true">{e.numero}</span>{e.court}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
