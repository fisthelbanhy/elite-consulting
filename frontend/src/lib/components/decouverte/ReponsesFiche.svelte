<script lang="ts">
	/** Lecture seule des réponses de la fiche (fiche clôturée, vue gestionnaire). */
	import { ETAPES_FICHE, libelleOuiNon } from './questions';
	import type { FicheDetail } from '$lib/types/decouverte';

	let { fiche }: { fiche: FicheDetail } = $props();

	function affichage(champ: keyof FicheDetail, genre: string, question: (typeof ETAPES_FICHE)[number]['questions'][number]): string {
		const v = fiche[champ];
		if (genre === 'ouinon') return libelleOuiNon(question, Number(v));
		if (genre === 'pourcentage') return v || v === 0 ? `${v} %` : '';
		return String(v ?? '').trim();
	}
</script>

<div class="space-y-6">
	{#each ETAPES_FICHE as e, i (e.titre)}
		<section class="carte p-6" aria-labelledby="lecture-etape-{i}">
			<h2 id="lecture-etape-{i}" class="text-xl font-bold">{e.titre}</h2>
			<dl class="mt-4 divide-y divide-fleuve-900/5">
				{#each e.questions as q (q.champ)}
					{@const texte = affichage(q.champ, q.genre, q)}
					<div class="py-3">
						<dt class="text-[15px] font-semibold text-ardoise">{q.numero}. {q.libelle}</dt>
						<dd class="mt-1 whitespace-pre-line {texte ? '' : 'text-ardoise italic'}">{texte || 'Pas de réponse'}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/each}
</div>
