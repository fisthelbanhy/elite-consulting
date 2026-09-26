<script lang="ts">
	/**
	 * Suivi d'une fiche par la frangine : état de suivi (droit Activation), clôture/réouverture,
	 * suppression logique (droit Activation). Actions `?/etat`, `?/cloture`, `?/supprimer`.
	 */
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { FicheDetail } from '$lib/types/decouverte';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string } | null | undefined;

	let { fiche, form, modifier = false }: { fiche: FicheDetail; form: Retour; modifier?: boolean } = $props();
	const cloturee = $derived(fiche.cloturee === 1);
</script>

<aside class="carte space-y-5 p-5" aria-label="Suivi de la fiche">
	<h2 class="flex items-center gap-2 text-lg font-bold"><ShieldCheck class="size-5 text-fleuve-600" aria-hidden="true" />Suivi</h2>

	{#if fiche.peut_modifier}
		<Bouton href={modifier ? `/decouverte-de-soi/fiches/${fiche.id}` : `/decouverte-de-soi/fiches/${fiche.id}?modifier=1`} variante="secondaire" pleineLargeur>
			<Pencil class="size-4" aria-hidden="true" />{modifier ? 'Revenir à la lecture' : 'Modifier les réponses'}
		</Bouton>
	{/if}

	{#if fiche.peut_moderer}
		<Formulaire action="?/etat" {form} cle="suivi">
			{#snippet children({ envoi })}
				<label for="suivi-etat" class="mb-1.5 block text-[15px] font-semibold">État de la fiche</label>
				<div class="flex gap-2">
					<select id="suivi-etat" name="etat" class="flex-1">
						<option value="1" selected={fiche.etat_fiche === 1}>À étudier (non traitée)</option>
						<option value="2" selected={fiche.etat_fiche === 2}>Suivie (autorisée)</option>
					</select>
					<Bouton type="submit" variante="fleuve" chargement={envoi}>OK</Bouton>
				</div>
			{/snippet}
		</Formulaire>
	{/if}

	{#if fiche.peut_moderer}
		<Formulaire action="?/cloture" {form} cle="cloture">
			{#snippet children({ envoi })}
				<input type="hidden" name="cloturee" value={cloturee ? '0' : '1'} />
				<Bouton type="submit" variante="secondaire" pleineLargeur chargement={envoi}>{cloturee ? 'Rouvrir la fiche' : 'Clôturer la fiche'}</Bouton>
			{/snippet}
		</Formulaire>
		{#if fiche.etat !== 3}
			<Formulaire action="?/supprimer" confirmer="Supprimer la fiche {fiche.reference} ? Elle disparaîtra de la liste.">
				{#snippet children({ envoi })}
					<Bouton type="submit" variante="danger" pleineLargeur chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Supprimer</Bouton>
				{/snippet}
			</Formulaire>
		{/if}
	{:else}
		<p class="text-sm text-ardoise">Le droit « Activation » est nécessaire pour changer l'état, clôturer ou supprimer une fiche.</p>
	{/if}
</aside>
