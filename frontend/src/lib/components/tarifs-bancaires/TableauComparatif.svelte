<script lang="ts">
	/**
	 * Tableau comparatif (F-S7-41, ADR-0007 S7b) : lignes = opérations groupées par type,
	 * colonnes = banques. Première colonne figée pour le défilement horizontal sur mobile.
	 */
	import type { Comparatif } from '$lib/types/tarifs-bancaires';

	let { comparatif: c }: { comparatif: Comparatif } = $props();
	const types = $derived(c.types.filter((t) => t.operations.length));
	const tarif = (op: Comparatif['types'][number]['operations'][number], banque: number) =>
		op.tarifs.filter((t) => t.banque_id === banque).map((t) => t.tarif);
</script>

<div class="carte overflow-hidden">
	<!-- Région défilante focalisable : le tableau reste lisible au clavier (WCAG 2.1.1) -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="overflow-x-auto" role="region" aria-label="Tableau comparatif des tarifs bancaires" tabindex="0">
		<table class="w-full min-w-max border-collapse text-left text-[15px]">
			<caption class="sr-only">Tarifs pratiqués par chaque banque, par type d'opération</caption>
			<thead>
				<tr class="bg-fleuve-700 text-white">
					<th scope="col" class="sticky left-0 z-10 min-w-56 bg-fleuve-700 px-4 py-3 font-semibold">Opération</th>
					{#each c.banques as b (b.id)}
						<th scope="col" class="px-4 py-3 font-semibold whitespace-nowrap"><abbr title={b.nom} class="no-underline">{b.sigle || b.nom}</abbr></th>
					{/each}
				</tr>
			</thead>
			{#each types as t (t.id)}
				<tbody>
					<tr class="bg-sable">
						<th scope="colgroup" colspan={c.banques.length + 1} class="sticky left-0 px-4 py-2 font-display font-bold text-fleuve-800">{t.libelle}</th>
					</tr>
					{#each t.operations as op (op.id)}
						<tr class="border-t border-fleuve-900/5 even:bg-creme/60">
							<th scope="row" class="sticky left-0 z-10 bg-white px-4 py-3 font-semibold">{op.libelle}</th>
							{#each c.banques as b (b.id)}
								{@const valeurs = tarif(op, b.id)}
								<td class="px-4 py-3 align-top">
									{#if valeurs.length}
										{#each valeurs as v, i (i)}<span class="block">{v}</span>{/each}
									{:else}
										<span class="text-ardoise" aria-label="Tarif non renseigné">—</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			{/each}
		</table>
	</div>
</div>
