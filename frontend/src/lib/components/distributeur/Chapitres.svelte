<script lang="ts">
	/** Les 5 chapitres de présentation (`$arraypresentation`, F-S5-05) avec sommaire. */
	import BookOpen from '@lucide/svelte/icons/book-open';
	import TexteBloc from './TexteBloc.svelte';
	import { CHAPITRES, LEXIQUE } from './contenus';
</script>

<div class="grid gap-8 lg:grid-cols-[15rem_1fr]">
	<nav aria-label="Sommaire de la présentation" class="lg:sticky lg:top-24 lg:self-start">
		<p class="mb-2 flex items-center gap-2 font-semibold text-fleuve-800"><BookOpen class="size-5" aria-hidden="true" />Au sommaire</p>
		<ol class="space-y-1 text-[15px]">
			{#each CHAPITRES as c, i (c.id)}
				<li><a href="#{c.id}" class="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-fleuve-50"><span class="font-bold text-laterite-600">{i + 1}</span>{c.titre}</a></li>
			{/each}
		</ol>
	</nav>
	<div class="space-y-6">
		{#each CHAPITRES as c, i (c.id)}
			<section id={c.id} class="carte scroll-mt-24 p-6 sm:p-8" aria-labelledby="titre-{c.id}">
				<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Chapitre {i + 1}</p>
				<h2 id="titre-{c.id}" class="mt-1 text-2xl font-bold">{c.titre}</h2>
				<div class="mt-4"><TexteBloc bloc={c} /></div>
			</section>
		{/each}
		<section class="rounded-carte bg-sable/60 p-6" aria-labelledby="titre-lexique">
			<h2 id="titre-lexique" class="text-lg font-bold">Petit lexique</h2>
			<dl class="mt-3 space-y-2 text-[15px]">
				{#each LEXIQUE as l (l.terme)}
					<div><dt class="inline font-bold">{l.terme} :</dt> <dd class="inline">{l.definition}</dd></div>
				{/each}
			</dl>
			<p class="mt-4 text-sm text-ardoise">
				Les revenus d'un distributeur dépendent uniquement de son activité et de celle de son équipe : aucun gain n'est
				garanti.
			</p>
		</section>
	</div>
</div>
