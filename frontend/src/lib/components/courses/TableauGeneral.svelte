<script lang="ts">
	/** Affichage « Général » (F-S3-49) : une ligne par article, regroupée par course. */
	import { dateCourte, dateHeure, fcfa } from '$lib/format';
	import type { CourseResume } from '$lib/types/courses';
	import BadgeEtatCourse from './BadgeEtatCourse.svelte';

	let { courses }: { courses: CourseResume[] } = $props();
</script>

<div class="carte overflow-x-auto">
	<table class="w-full min-w-[44rem] text-left text-[15px]">
		<caption class="sr-only">Articles commandés, par course</caption>
		<thead class="bg-sable text-sm text-ardoise">
			<tr>
				<th scope="col" class="px-3 py-2">Course</th>
				<th scope="col" class="px-3 py-2">Achats / livraison</th>
				<th scope="col" class="px-3 py-2">Article</th>
				<th scope="col" class="px-3 py-2 text-right">Prix maxi</th>
				<th scope="col" class="px-3 py-2 text-right">Qté</th>
				<th scope="col" class="px-3 py-2 text-right">Montant</th>
			</tr>
		</thead>
		<tbody>
			{#each courses as c (c.id)}
				{#each c.lignes.length ? c.lignes : [null] as l, i (i)}
					<tr class="border-t border-fleuve-900/5 {i === 0 ? 'border-fleuve-900/15' : ''}">
						{#if i === 0}
							<td class="px-3 py-2 align-top" rowspan={Math.max(c.lignes.length, 1)}>
								<a href="/courses/{c.id}" class="lien font-semibold">{c.reference}</a>
								<span class="mt-1 block"><BadgeEtatCourse etat={c.etat_course} /></span>
								<span class="block text-sm text-ardoise">{c.client?.pseudonyme ?? ''}</span>
							</td>
							<td class="px-3 py-2 align-top text-sm" rowspan={Math.max(c.lignes.length, 1)}>
								{dateCourte(c.date_achat)}<br /><span class="text-ardoise">{dateHeure(c.date_livraison)}</span>
							</td>
						{/if}
						{#if l}
							<td class="px-3 py-2">{l.nom_article}{#if l.observation}<span class="block text-sm text-ardoise">{l.observation}</span>{/if}</td>
							<td class="montant px-3 py-2 text-right">{fcfa(l.prix_plafond)}</td>
							<td class="px-3 py-2 text-right">{l.quantite}</td>
							<td class="montant px-3 py-2 text-right font-semibold">{fcfa(l.montant)}</td>
						{:else}
							<td class="px-3 py-2 text-ardoise" colspan="4">Aucun article</td>
						{/if}
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>
