<script lang="ts">
	/** Liste de gestion des publicités, en tableau ou en cartes (F-ADM-38). */
	import Eye from '@lucide/svelte/icons/eye';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MediaPublicite from './MediaPublicite.svelte';
	import { dateCourte, entier, tronquer } from '$lib/format';
	import { ETATS_PUBLICITE, type PubliciteGestion } from '$lib/types/publicites';

	let { items, vue = 'tableau' }: { items: PubliciteGestion[]; vue?: 'tableau' | 'cartes' | string } = $props();
</script>

{#if vue === 'cartes'}
	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each items as p (p.id)}
			<li>
				<a href="/gestion/publicites/{p.id}" class="carte flex h-full flex-col gap-3 p-3 hover:shadow-levee">
					<MediaPublicite pub={{ fichier_url: p.fichier_url, genre: p.genre, annonceur: p.entreprise?.nom_affiche }} />
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-semibold text-fleuve-800">{p.reference}</span>
						<BadgeEtat etat={p.etat} libelles={ETATS_PUBLICITE} />
						{#if p.en_diffusion}<Badge ton="foret">En diffusion</Badge>{/if}
					</div>
					<p class="text-[15px]">{tronquer(p.texte_affiche, 100)}</p>
					<dl class="mt-auto grid grid-cols-3 gap-2 rounded-xl bg-creme p-2 text-center text-sm">
						<div><dt class="text-ardoise">Début</dt><dd class="font-semibold">{dateCourte(p.date_debut)}</dd></div>
						<div><dt class="text-ardoise">Fin</dt><dd class="font-semibold">{dateCourte(p.date_fin)}</dd></div>
						<div><dt class="text-ardoise">Vues</dt><dd class="montant font-semibold">{entier(p.nombre_vues)}</dd></div>
					</dl>
					<p class="text-sm text-ardoise">
						{p.entreprise?.nom_affiche ?? 'Entreprise ?'} · demandée par {p.demandeur?.pseudonyme || p.demandeur?.nom || '—'}
					</p>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<div class="carte overflow-x-auto">
		<table class="w-full min-w-[56rem] text-left text-[15px]">
			<caption class="sr-only">Publicités</caption>
			<thead class="bg-creme text-sm text-ardoise">
				<tr>
					<th scope="col" class="px-3 py-3 font-semibold">Référence</th>
					<th scope="col" class="px-3 py-3 font-semibold">Insertion</th>
					<th scope="col" class="px-3 py-3 font-semibold">Début</th>
					<th scope="col" class="px-3 py-3 font-semibold">Fin</th>
					<th scope="col" class="px-3 py-3 font-semibold">Demandeur</th>
					<th scope="col" class="px-3 py-3 font-semibold">Texte</th>
					<th scope="col" class="px-3 py-3 text-right font-semibold">Vues</th>
					<th scope="col" class="px-3 py-3 font-semibold">État</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-fleuve-900/5">
				{#each items as p (p.id)}
					<tr class="hover:bg-creme">
						<td class="px-3 py-3"><a href="/gestion/publicites/{p.id}" class="lien font-semibold">{p.reference || `#${p.id}`}</a></td>
						<td class="px-3 py-3 whitespace-nowrap">{dateCourte(p.date_creation)}</td>
						<td class="px-3 py-3 whitespace-nowrap">{dateCourte(p.date_debut)}</td>
						<td class="px-3 py-3 whitespace-nowrap">{dateCourte(p.date_fin)}</td>
						<td class="px-3 py-3">{p.demandeur?.pseudonyme || p.demandeur?.nom || '—'}</td>
						<td class="px-3 py-3"><a href="/gestion/publicites/{p.id}" class="hover:underline">{tronquer(p.texte_affiche, 50)}</a></td>
						<td class="montant px-3 py-3 text-right"><span class="inline-flex items-center gap-1"><Eye class="size-4 text-ardoise" aria-hidden="true" />{entier(p.nombre_vues)}</span></td>
						<td class="px-3 py-3">
							<span class="flex flex-wrap gap-1">
								<BadgeEtat etat={p.etat} libelles={ETATS_PUBLICITE} />
								{#if p.en_diffusion}<Badge ton="foret">En diffusion</Badge>{/if}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
