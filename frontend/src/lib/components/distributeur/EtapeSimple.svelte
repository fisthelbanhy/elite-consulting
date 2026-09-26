<script lang="ts">
	/** Étapes à un seul champ (1 objectifs, 2 histoire, 3 disponibilité, 7 rendez-vous) et étape 6 (texte seul). */
	import Phone from '@lucide/svelte/icons/phone';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import TexteBloc from './TexteBloc.svelte';
	import { DISPONIBILITES, INTRODUCTIONS, RAPPELS_SCENARIOS, SCENARIOS } from './contenus';
	import { champ, valeur } from '$lib/forms';
	import type { SouscriptionDetail } from '$lib/types/distributeur';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let { etape, souscription: s, form }: { etape: number; souscription: SouscriptionDetail | null; form: Retour } = $props();
</script>

<TexteBloc bloc={INTRODUCTIONS[etape]} />

{#if etape === 1}
	<Zone label="Mes trois objectifs prioritaires" lignes={5} placeholder="1. …&#10;2. …&#10;3. …" {...champ(form, 'objectifs', s?.objectifs)} />
{:else if etape === 2}
	<Zone label="Mon histoire" lignes={6} aide="Pourquoi vous lancez-vous ? Quelques phrases suffisent." {...champ(form, 'mon_histoire', s?.mon_histoire)} />
{:else if etape === 3}
	<Choix
		legende="Nombre d'heures par semaine"
		name="disponibilite_hebdo"
		value={String(valeur(form, 'disponibilite_hebdo', s?.disponibilite_hebdo || ''))}
		options={DISPONIBILITES}
		colonnes={3}
	/>
{:else if etape === 6}
	<div class="space-y-4">
		{#each SCENARIOS as sc (sc.titre)}
			<figure class="rounded-xl bg-creme p-4">
				<figcaption class="flex items-center gap-2 font-semibold text-fleuve-800"><Phone class="size-4" aria-hidden="true" />{sc.titre}</figcaption>
				<blockquote class="mt-2 text-[16px] italic">{sc.texte}</blockquote>
			</figure>
		{/each}
		<div>
			<p>{RAPPELS_SCENARIOS.intro}</p>
			<ul class="mt-2 list-disc space-y-1 pl-6 marker:text-laterite-600">
				{#each RAPPELS_SCENARIOS.puces as p (p)}<li>{p}</li>{/each}
			</ul>
			<p class="mt-3 font-semibold">{RAPPELS_SCENARIOS.fin}</p>
		</div>
	</div>
{:else if etape === 7}
	<Saisie
		label="Nombre de rendez-vous individuels le premier mois"
		type="number"
		inputmode="numeric"
		min="0"
		max="999"
		class="max-w-xs"
		{...champ(form, 'nombre_rdv', s?.nombre_rdv || '')}
	/>
{/if}
