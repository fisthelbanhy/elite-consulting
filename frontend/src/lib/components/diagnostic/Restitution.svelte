<script lang="ts">
	/** Restitution du diagnostic : profil, points d'appui, points d'attention, 3 prochaines étapes. */
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { Restitution } from '$lib/types/decouverte';

	let { restitution: r, titreNiveau = 2 }: { restitution: Restitution; titreNiveau?: 2 | 3 } = $props();
	const h = $derived(`h${titreNiveau}`);
</script>

<div class="space-y-6">
	<section class="relative overflow-hidden rounded-3xl bg-fleuve-700 p-6 text-white sm:p-8" aria-labelledby="titre-profil">
		<div class="pagne pointer-events-none absolute inset-0 opacity-20" aria-hidden="true"></div>
		<p class="relative text-sm font-semibold tracking-wide text-soleil-300 uppercase">Votre profil</p>
		<svelte:element this={h} id="titre-profil" class="relative mt-1 text-[clamp(1.75rem,6vw,2.5rem)] leading-tight font-extrabold text-white">
			{r.profil.titre}
		</svelte:element>
		<p class="relative mt-3 max-w-2xl text-lg text-fleuve-100">{r.profil.texte}</p>
	</section>

	{#if r.forces.length || r.attentions.length}
		<div class="grid gap-4 md:grid-cols-2">
			{#if r.forces.length}
				<section class="carte p-5" aria-labelledby="titre-forces">
					<svelte:element this={h} id="titre-forces" class="text-lg font-bold">Vos points d'appui</svelte:element>
					<ul class="mt-3 space-y-2">
						{#each r.forces as f (f)}
							<li class="flex gap-2"><CircleCheck class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />{f}</li>
						{/each}
					</ul>
				</section>
			{/if}
			{#if r.attentions.length}
				<section class="carte p-5" aria-labelledby="titre-attentions">
					<svelte:element this={h} id="titre-attentions" class="text-lg font-bold">À surveiller</svelte:element>
					<ul class="mt-3 space-y-2">
						{#each r.attentions as a (a)}
							<li class="flex gap-2"><TriangleAlert class="mt-0.5 size-5 shrink-0 text-laterite-600" aria-hidden="true" />{a}</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}

	<section aria-labelledby="titre-etapes">
		<svelte:element this={h} id="titre-etapes" class="text-2xl font-bold">Vos 3 prochaines étapes</svelte:element>
		<ol class="mt-4 grid gap-4 md:grid-cols-3">
			{#each r.etapes as e, i (e.href)}
				<li>
					<a href={e.href} class="carte group flex h-full flex-col p-5 transition-shadow hover:shadow-levee">
						<span class="grid size-10 place-items-center rounded-full bg-laterite-600 font-display text-lg font-extrabold text-white" aria-hidden="true">{i + 1}</span>
						<span class="mt-4 font-display text-lg leading-snug font-bold text-fleuve-800">{e.titre}</span>
						<span class="mt-1 flex-1 text-[15px] text-ardoise">{e.texte}</span>
						<span class="mt-4 inline-flex items-center gap-1 font-semibold text-fleuve-700 group-hover:underline">
							J'y vais <ArrowRight class="size-4" aria-hidden="true" />
						</span>
					</a>
				</li>
			{/each}
		</ol>
	</section>
</div>
