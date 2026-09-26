<script lang="ts">
	/** Journal des pointages (F-S4-58/59) : date, caisse, membre, versement, retrait (rouge), solde, puis
	 * « TOTAL DES OPÉRATIONS », « RENTABILITÉ » (3 % des versements) et « ENCAISSE ». */
	import { dateHeure, fcfa } from '$lib/format';
	import type { ListePointages } from '$lib/types/epargne';

	let { liste: l }: { liste: ListePointages } = $props();
</script>

<div class="carte overflow-x-auto">
	<table class="w-full min-w-[40rem] text-[15px]">
		<caption class="sr-only">Opérations de carte de pointage</caption>
		<thead>
			<tr class="border-b border-fleuve-900/10 text-left text-sm text-ardoise">
				<th scope="col" class="px-4 py-3 font-semibold">Date</th>
				<th scope="col" class="px-4 py-3 font-semibold">Caisse</th>
				<th scope="col" class="px-4 py-3 font-semibold">Membre</th>
				<th scope="col" class="px-4 py-3 text-right font-semibold">Versement</th>
				<th scope="col" class="px-4 py-3 text-right font-semibold">Retrait</th>
				{#if l.afficher_solde}<th scope="col" class="px-4 py-3 text-right font-semibold">Solde</th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each l.items as p (p.id)}
				<tr class="border-b border-fleuve-900/5 align-top">
					<td class="px-4 py-3">
						{dateHeure(p.date_heure)}
						<span class="block text-xs text-ardoise">{p.reference}{#if p.type_caisse === 2} · encaisse{/if}</span>
					</td>
					<td class="px-4 py-3">{p.operateur?.nom ?? '—'}</td>
					<td class="px-4 py-3">
						{p.membre.nom}
						{#if p.motif}<span class="block text-xs text-ardoise">{p.motif}</span>{/if}
					</td>
					<td class="montant px-4 py-3 text-right font-semibold text-foret-700">{p.type_operation === 1 ? fcfa(p.montant) : ''}</td>
					<td class="montant px-4 py-3 text-right font-semibold text-alerte">{p.type_operation === 2 ? fcfa(p.montant) : ''}</td>
					{#if l.afficher_solde}<td class="montant px-4 py-3 text-right">{p.solde_apres !== null ? fcfa(p.solde_apres) : '—'}</td>{/if}
				</tr>
			{/each}
		</tbody>
		<tfoot class="bg-creme font-semibold">
			<tr>
				<th scope="row" colspan="3" class="px-4 py-3 text-left">Total des opérations</th>
				<td class="montant px-4 py-3 text-right text-foret-700">{fcfa(l.total_versements)}</td>
				<td class="montant px-4 py-3 text-right text-alerte">{fcfa(l.total_retraits)}</td>
				{#if l.afficher_solde}<td class="montant px-4 py-3 text-right">{fcfa(l.net)}</td>{/if}
			</tr>
			<tr>
				<th scope="row" colspan="3" class="px-4 py-3 text-left">Rentabilité <span class="font-normal text-ardoise">(3 % des versements)</span></th>
				<td class="montant px-4 py-3 text-right">{fcfa(l.rentabilite)}</td>
				<td></td>
				{#if l.afficher_solde}<td></td>{/if}
			</tr>
			{#if l.encaisse !== null}
				<tr>
					<th scope="row" colspan="3" class="px-4 py-3 text-left">{l.libelle_encaisse || 'Encaisse'}</th>
					<td class="montant px-4 py-3 text-right text-fleuve-800">{fcfa(l.encaisse)}</td>
					<td></td>
					{#if l.afficher_solde}<td></td>{/if}
				</tr>
			{/if}
		</tfoot>
	</table>
</div>
