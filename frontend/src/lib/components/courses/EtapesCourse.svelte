<script lang="ts">
	/** Suivi visuel de la course : commandée → achats effectués → livrée (ou annulée). */
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	let { etat, payee }: { etat: number; payee: boolean } = $props();
	const rang: Record<number, number> = { 1: 1, 3: 3, 4: 4 };
	const etapes = $derived([
		{ n: 1, label: 'Commandée' },
		{ n: 2, label: payee ? 'Payée' : 'Paiement' },
		{ n: 3, label: 'Achats effectués' },
		{ n: 4, label: 'Livrée' }
	]);
	const courant = $derived(etat === 1 ? (payee ? 2 : 1) : (rang[etat] ?? 1));
</script>

{#if etat === 2}
	<p class="flex items-center gap-2 rounded-xl bg-alerte-50 p-4 font-semibold text-alerte"><X class="size-5" aria-hidden="true" />Cette course a été annulée.</p>
{:else}
	<ol class="grid grid-cols-4 gap-1" aria-label="Avancement de la course">
		{#each etapes as e (e.n)}
			{@const fait = e.n <= courant}
			<li class="flex flex-col items-center gap-1 text-center text-xs sm:text-sm" aria-current={e.n === courant ? 'step' : undefined}>
				<span class="grid size-9 place-items-center rounded-full font-bold {fait ? 'bg-foret-600 text-white' : 'bg-sable text-ardoise'}">
					{#if fait}<Check class="size-5" aria-hidden="true" />{:else}{e.n}{/if}
				</span>
				<span class={fait ? 'font-semibold text-encre' : 'text-ardoise'}>{e.label}</span>
			</li>
		{/each}
	</ol>
{/if}
