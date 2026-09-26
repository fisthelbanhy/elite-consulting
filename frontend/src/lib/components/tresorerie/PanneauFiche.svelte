<script lang="ts">
	/**
	 * Gestion d'une fiche de trésorerie : état (gestionnaire habilité, le membre est prévenu),
	 * modification et annulation avec confirmation (F-S7-24). Actions `?/etat` et `?/supprimer`.
	 */
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Ban from '@lucide/svelte/icons/ban';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { ETATS_TRESORERIE } from '$lib/types/tresorerie';

	let {
		etat,
		peutModerer = false,
		peutModifier = false,
		peutAnnuler = false,
		lienModifier,
		form
	}: {
		etat: number;
		peutModerer?: boolean;
		peutModifier?: boolean;
		peutAnnuler?: boolean;
		lienModifier?: string;
		form?: Record<string, unknown> | null;
	} = $props();

	const retour = $derived(form as { cle?: string; message?: string; champs?: Record<string, string>; succes?: string } | null);
</script>

<aside class="carte space-y-4 p-5" aria-label="Gestion de la fiche">
	<div class="flex items-center justify-between gap-2">
		<h2 class="flex items-center gap-2 text-lg font-bold"><ShieldCheck class="size-5 text-fleuve-600" aria-hidden="true" />Suivi</h2>
		<BadgeEtat {etat} libelles={ETATS_TRESORERIE} />
	</div>
	{#if peutModifier && lienModifier}
		<Bouton href={lienModifier} variante="secondaire" pleineLargeur><Pencil class="size-4" aria-hidden="true" />Modifier</Bouton>
	{/if}
	{#if peutModerer}
		<Formulaire action="?/etat" form={retour} cle="moderation">
			{#snippet children({ envoi })}
				<label for="suivi-etat" class="mb-1.5 block text-[15px] font-semibold">État (le membre est prévenu)</label>
				<div class="flex gap-2">
					<select id="suivi-etat" name="etat" class="flex-1">
						{#each Object.entries(ETATS_TRESORERIE) as [v, l] (v)}<option value={v} selected={Number(v) === etat}>{l}</option>{/each}
					</select>
					<Bouton type="submit" variante="fleuve" chargement={envoi}>OK</Bouton>
				</div>
			{/snippet}
		</Formulaire>
	{/if}
	{#if peutAnnuler && etat !== 3}
		<Formulaire action="?/supprimer" form={retour} cle="moderation" confirmer="Annuler cette fiche ? Elle disparaîtra de vos listes.">
			{#snippet children({ envoi })}
				<Bouton type="submit" variante="danger" pleineLargeur chargement={envoi}><Ban class="size-4" aria-hidden="true" />Annuler la fiche</Bouton>
			{/snippet}
		</Formulaire>
	{/if}
</aside>
