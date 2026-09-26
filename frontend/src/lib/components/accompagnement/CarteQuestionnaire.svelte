<script lang="ts">
	/** Présentation d'un accompagnement sur la page d'accueil de l'accompagnement. */
	import type { Component } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Users from '@lucide/svelte/icons/users';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import type { Questionnaire } from '$lib/types/accompagnement';

	let { questionnaire: q, icone, mesDossiers = null }: { questionnaire: Questionnaire; icone: Component; mesDossiers?: number | null } = $props();
	const Icone = $derived(icone);
</script>

<a href="/accompagnement/{q.slug}" class="carte group flex h-full flex-col gap-4 p-6 transition-shadow hover:shadow-levee">
	<div class="flex items-start justify-between gap-3">
		<span class="grid size-12 place-items-center rounded-full bg-laterite-50 text-laterite-600"><Icone class="size-6" aria-hidden="true" /></span>
		{#if mesDossiers}<span class="rounded-full bg-fleuve-50 px-3 py-1 text-sm font-semibold text-fleuve-700">{mesDossiers} dossier{mesDossiers > 1 ? 's' : ''}</span>{/if}
	</div>
	<div>
		<h2 class="text-xl font-bold">{q.libelle}</h2>
		<p class="mt-1 font-semibold text-encre">{q.accroche}</p>
		<p class="mt-2 text-[15px] text-ardoise">{q.description}</p>
	</div>
	<ul class="mt-auto space-y-1.5 text-sm text-ardoise">
		<li class="flex items-start gap-2"><Users class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{q.pour_qui}</li>
		<li class="flex items-start gap-2"><ListChecks class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{q.sections.length} parties, {q.nombre_questions} questions à remplir à votre rythme</li>
	</ul>
	<span class="inline-flex items-center gap-1 font-semibold text-fleuve-700 group-hover:underline">
		Préparer mon dossier<ArrowRight class="size-4" aria-hidden="true" />
	</span>
</a>
