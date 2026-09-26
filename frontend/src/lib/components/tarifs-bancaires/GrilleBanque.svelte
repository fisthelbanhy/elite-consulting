<script lang="ts">
	/**
	 * Saisie de tous les tarifs d'une banque (gestionnaire habilité ou membre « banque » rattaché,
	 * F-S7-42) : une ligne par opération ; vider une case retire le tarif.
	 */
	import Save from '@lucide/svelte/icons/save';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { BanqueCourte, Comparatif } from '$lib/types/tarifs-bancaires';

	let { comparatif, banque, form }: { comparatif: Comparatif; banque: BanqueCourte; form?: Record<string, unknown> | null } = $props();
	const valeur = (op: Comparatif['types'][number]['operations'][number]) => op.tarifs.find((t) => t.banque_id === banque.id)?.tarif ?? '';
</script>

<Formulaire action="?/grille" {form} cle="grille">
	{#snippet children({ envoi })}
		<input type="hidden" name="banque_id" value={banque.id} />
		<div class="space-y-6">
			{#each comparatif.types.filter((t) => t.operations.length) as t (t.id)}
				<fieldset class="carte space-y-3 p-5">
					<legend class="sr-only">{t.libelle}</legend>
					<h3 class="font-display text-lg font-bold text-fleuve-800">{t.libelle}</h3>
					{#each t.operations as op (op.id)}
						<div class="grid gap-1 sm:grid-cols-[1fr_16rem] sm:items-center sm:gap-4">
							<label for="tarif-{op.id}" class="text-[15px] font-semibold">{op.libelle}</label>
							<input id="tarif-{op.id}" name="tarif_{op.id}" type="text" maxlength="100" value={valeur(op)} placeholder="Ex. : 2 500 FCFA, 1 %, gratuit" />
						</div>
					{/each}
				</fieldset>
			{/each}
			<div class="sticky bottom-0 z-10 flex justify-end rounded-xl border border-fleuve-900/10 bg-white/95 p-3 backdrop-blur">
				<Bouton type="submit" chargement={envoi}><Save class="size-5" aria-hidden="true" />Enregistrer les tarifs de {banque.sigle || banque.nom}</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
