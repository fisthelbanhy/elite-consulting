<script lang="ts">
	/** Suivi d'un apport par la frangine (droit Activation) : valider, enregistrer un versement, annuler. */
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import { fcfa } from '$lib/format';
	import type { ApportDetail } from '$lib/types/projets';

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string; succes?: string } | null | undefined;

	let { apport: a, form }: { apport: ApportDetail; form: Retour } = $props();
	const aujourdhui = new Date().toISOString().slice(0, 10);
</script>

<section class="carte space-y-5 p-5" aria-labelledby="titre-gestion-apport">
	<h2 id="titre-gestion-apport" class="flex items-center gap-2 text-lg font-bold"><ShieldCheck class="size-5 text-fleuve-600" aria-hidden="true" />Gestion de l'apport</h2>

	{#if a.etat !== 3}
		<Formulaire action="?/versement" {form} cle="versement" reinitialiser>
			{#snippet children({ envoi })}
				<div class="space-y-4">
					<h3 class="text-base font-bold">Enregistrer un versement reçu</h3>
					<Saisie label="Montant" type="number" inputmode="numeric" min="1" max={a.reste_a_verser} suffixe="FCFA" requis aide="Reste à verser : {fcfa(a.reste_a_verser)}" {...champ(form, 'montant', '', 'versement')} />
					<Saisie label="Date du versement" type="date" max={aujourdhui} {...champ(form, 'date_versement', aujourdhui, 'versement')} />
					<Zone label="Observation de la frangine" lignes={2} {...champ(form, 'observation_mediateur', a.observation_mediateur, 'versement')} />
					<Bouton type="submit" variante="fleuve" pleineLargeur chargement={envoi}>Enregistrer le versement</Bouton>
				</div>
			{/snippet}
		</Formulaire>
	{/if}

	<Formulaire action="?/valider" {form} cle="gestion">
		{#snippet children({ envoi })}
			{#if a.etat === 1}
				<Bouton type="submit" variante="secondaire" pleineLargeur chargement={envoi}>Valider la promesse</Bouton>
			{/if}
		{/snippet}
	</Formulaire>
	{#if a.etat !== 3}
		<Formulaire action="?/annuler" confirmer="Annuler cet apport ? Seule la part non versée sera retirée du montant promis.">
			{#snippet children({ envoi })}
				<Bouton type="submit" variante="danger" pleineLargeur chargement={envoi}>Annuler l'apport</Bouton>
			{/snippet}
		</Formulaire>
	{/if}
</section>
