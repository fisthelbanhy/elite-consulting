<script lang="ts">
	/** Avis de la frangine (F-S4-19) : lecture pour tous, saisie pour les gestionnaires. */
	import Star from '@lucide/svelte/icons/star';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { ProjetDetail } from '$lib/types/projets';

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string; succes?: string } | null | undefined;

	let { projet: p, form }: { projet: ProjetDetail; form: Retour } = $props();
	const notes = Array.from({ length: 11 }, (_, i) => ({ value: i, label: i ? `${i} / 10` : 'Pas encore noté' }));
</script>

{#if p.peut_evaluer}
	<section class="carte space-y-4 p-5" aria-labelledby="titre-avis">
		<h2 id="titre-avis" class="flex items-center gap-2 text-lg font-bold"><BadgeCheck class="size-5 text-foret-600" aria-hidden="true" />Avis de la frangine</h2>
		<Formulaire action="?/evaluation" {form} cle="evaluation">
			{#snippet children({ envoi })}
				<div class="space-y-4">
					<Liste label="Appréciation" vide={null} options={notes} {...champ(form, 'appreciation', p.appreciation, 'evaluation')} />
					<Zone label="Observations sur le projet" lignes={4} aide="Visibles de tous les visiteurs de la fiche." {...champ(form, 'observation_gestionnaire', p.observation_gestionnaire, 'evaluation')} />
					<Bouton type="submit" variante="fleuve" pleineLargeur chargement={envoi}>Enregistrer l'avis</Bouton>
				</div>
			{/snippet}
		</Formulaire>
	</section>
{:else if p.appreciation || p.observation_gestionnaire}
	<section class="carte space-y-3 p-5" aria-labelledby="titre-avis">
		<h2 id="titre-avis" class="flex items-center gap-2 text-lg font-bold"><BadgeCheck class="size-5 text-foret-600" aria-hidden="true" />Avis de la frangine</h2>
		{#if p.appreciation}
			<p class="flex items-center gap-2">
				<Star class="size-5 fill-soleil-400 text-soleil-400" aria-hidden="true" />
				<span class="font-display text-2xl font-bold text-fleuve-800">{p.appreciation}<span class="text-base text-ardoise"> / 10</span></span>
			</p>
		{/if}
		{#if p.observation_gestionnaire}<p class="text-[15px] whitespace-pre-line">{p.observation_gestionnaire}</p>{/if}
	</section>
{/if}
