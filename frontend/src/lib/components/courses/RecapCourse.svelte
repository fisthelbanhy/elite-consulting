<script lang="ts">
	/** Récapitulatif calculé par le serveur après « Vérifier » : montant, frais figés, net à payer. */
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import { fcfa } from '$lib/format';
	import type { Recapitulatif } from '$lib/types/courses';

	let { recap }: { recap: Recapitulatif } = $props();
</script>

<section class="carte p-5 ring-2 ring-foret-600/30" aria-live="polite" aria-labelledby="titre-recap">
	<h2 id="titre-recap" class="flex items-center gap-2 text-xl font-bold"><CircleCheck class="size-6 text-foret-600" aria-hidden="true" />Votre commande est prête</h2>
	<p class="mt-1 text-[15px] text-ardoise">Vérifiez le récapitulatif puis confirmez. Achats : {recap.lieu_achat}</p>
	<div class="mt-4 overflow-x-auto">
		<table class="w-full text-left text-[15px]">
			<thead class="text-sm text-ardoise">
				<tr><th class="py-1 pr-2 font-semibold">Article</th><th class="px-2 py-1 text-right font-semibold">Prix maxi</th><th class="px-2 py-1 text-right font-semibold">Qté</th><th class="py-1 pl-2 text-right font-semibold">Montant</th></tr>
			</thead>
			<tbody class="divide-y divide-fleuve-900/5">
				{#each recap.lignes as l, i (i)}
					<tr>
						<td class="py-1.5 pr-2">{l.nom_article}{#if l.observation}<span class="block text-sm text-ardoise">{l.observation}</span>{/if}</td>
						<td class="montant px-2 py-1.5 text-right">{fcfa(l.prix_plafond)}</td>
						<td class="px-2 py-1.5 text-right">{l.quantite}</td>
						<td class="montant py-1.5 pl-2 text-right font-semibold">{fcfa(l.montant)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<dl class="mt-4 space-y-1 border-t border-fleuve-900/5 pt-3 text-[15px]">
		<div class="flex justify-between"><dt>Montant des courses</dt><dd class="montant font-semibold">{fcfa(recap.montant_achats)}</dd></div>
		<div class="flex justify-between"><dt>Frais de course</dt><dd class="montant font-semibold">{fcfa(recap.frais_service)}</dd></div>
		<div class="flex items-baseline justify-between pt-1"><dt class="font-bold">Net à payer</dt><dd class="montant font-display text-2xl font-extrabold text-laterite-700">{fcfa(recap.net_a_payer)}</dd></div>
	</dl>
</section>
