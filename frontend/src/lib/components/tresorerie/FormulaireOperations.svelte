<script lang="ts">
	/**
	 * Saisie en grille de 1 à 15 ordres de virement (S7-10, F-S7-29) : une référence commune au
	 * lot ; les lignes incomplètes sont signalées (F-S7-30). Sans JavaScript, le nombre de lignes
	 * se choisit par le lien « ?lignes=n ».
	 */
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import Send from '@lucide/svelte/icons/send';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import LigneOperation from './LigneOperation.svelte';
	import { valeur } from '$lib/forms';
	import type { BanqueCourte } from '$lib/types/tresorerie';

	const MAX = 15;
	let {
		form,
		banques,
		lignesInitiales = 1
	}: {
		form: Record<string, unknown> | null | undefined;
		banques: BanqueCourte[];
		lignesInitiales?: number;
	} = $props();

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	// Seul le retour de ce formulaire (la page porte aussi le dialogue et le suivi)
	const f = $derived((form as Retour)?.cle === 'fiche' ? (form as Retour) : null);
	const depart = () => Math.min(MAX, Math.max(1, Number(valeur(f, 'nombre_lignes', lignesInitiales)) || 1));
	let nombre = $state(depart());
	const erreursLigne = (i: number) => Object.keys(f?.champs ?? {}).some((k) => k.endsWith(`_${i}`));
</script>

<Formulaire form={f} cle="fiche">
	{#snippet children({ envoi })}
		<input type="hidden" name="nombre_lignes" value={nombre} />
		<div class="space-y-5">
			{#each Array.from({ length: nombre }, (_, i) => i) as i (i)}
				<fieldset class="carte p-5 sm:p-6 {erreursLigne(i) ? 'ring-2 ring-alerte/40' : ''}">
					<legend class="sr-only">Opération {i + 1}</legend>
					<h2 class="mb-4 text-lg font-bold">Opération {i + 1}</h2>
					<LigneOperation form={f} {banques} suffixe="_{i}" />
				</fieldset>
			{/each}

			<div class="flex flex-wrap items-center gap-3">
				{#if nombre < MAX}
					<Bouton variante="secondaire" onclick={() => (nombre = Math.min(MAX, nombre + 1))}>
						<Plus class="size-5" aria-hidden="true" />Ajouter une opération
					</Bouton>
				{/if}
				{#if nombre > 1}
					<Bouton variante="fantome" onclick={() => (nombre = Math.max(1, nombre - 1))}>
						<Minus class="size-5" aria-hidden="true" />Retirer la dernière
					</Bouton>
				{/if}
				<noscript><a href="?lignes={Math.min(MAX, nombre + 1)}" class="lien">Ajouter une ligne</a></noscript>
				<span class="text-sm text-ardoise">{nombre} / {MAX} opérations</span>
			</div>

			<div class="flex items-start gap-3 rounded-xl bg-foret-50 p-4 text-[15px] text-foret-700">
				<ShieldCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
				<p>
					Si vous indiquez l'e-mail de votre banque (ou si elle en a un dans notre annuaire), l'ordre lui est transmis automatiquement.
					<strong>La Frangine ne détient jamais vos fonds</strong> : votre banque exécute l'ordre après ses propres vérifications.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}><Send class="size-5" aria-hidden="true" />Envoyer {nombre > 1 ? `les ${nombre} opérations` : "l'opération"}</Bouton>
				<Bouton href="/tresorerie/operations" variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
