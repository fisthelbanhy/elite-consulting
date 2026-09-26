<script lang="ts">
	/**
	 * Encadré de gestion d'une fiche : changement d'état (gestionnaire + droit Activation) et
	 * suppression (auteur ou gestionnaire habilité). Utilise les actions `?/etat` et `?/supprimer`
	 * fournies par `actionsModeration()`.
	 */
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Formulaire from './Formulaire.svelte';
	import Bouton from './Bouton.svelte';
	import BadgeEtat from './BadgeEtat.svelte';

	let {
		etat,
		peutModerer = false,
		peutModifier = false,
		lienModifier,
		form,
		etats = [
			{ value: 1, label: 'En attente (non traité)' },
			{ value: 2, label: 'Publié (autorisé)' },
			{ value: 3, label: 'Supprimé' },
			{ value: 4, label: 'Clôturé' }
		]
	}: {
		etat: number;
		peutModerer?: boolean;
		peutModifier?: boolean;
		lienModifier?: string;
		form?: { cle?: string; message?: string; champs?: Record<string, string>; succes?: string } | null;
		etats?: { value: number; label: string }[];
	} = $props();
</script>

{#if peutModerer || peutModifier}
	<aside class="carte space-y-4 p-5" aria-label="Gestion de la fiche">
		<div class="flex items-center justify-between gap-2">
			<h2 class="flex items-center gap-2 text-lg font-bold"><ShieldCheck class="size-5 text-fleuve-600" aria-hidden="true" />Gestion</h2>
			<BadgeEtat {etat} />
		</div>
		{#if peutModifier && lienModifier}
			<Bouton href={lienModifier} variante="secondaire" pleineLargeur><Pencil class="size-4" aria-hidden="true" />Modifier la fiche</Bouton>
		{/if}
		{#if peutModerer}
			<Formulaire action="?/etat" {form} cle="moderation">
				{#snippet children({ envoi })}
					<label for="moderation-etat" class="mb-1.5 block text-[15px] font-semibold">État de la fiche</label>
					<div class="flex gap-2">
						<select id="moderation-etat" name="etat" class="flex-1">
							{#each etats as e (e.value)}<option value={e.value} selected={e.value === etat}>{e.label}</option>{/each}
						</select>
						<Bouton type="submit" variante="fleuve" chargement={envoi}>OK</Bouton>
					</div>
				{/snippet}
			</Formulaire>
		{/if}
		{#if peutModifier && etat !== 3}
			<Formulaire action="?/supprimer" confirmer="Supprimer définitivement cette fiche de la liste publique ?">
				{#snippet children({ envoi })}
					<Bouton type="submit" variante="danger" pleineLargeur chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Supprimer</Bouton>
				{/snippet}
			</Formulaire>
		{/if}
	</aside>
{/if}
