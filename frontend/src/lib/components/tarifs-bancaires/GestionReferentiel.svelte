<script lang="ts">
	/**
	 * Gestion du référentiel (gestionnaire habilité) : types d'opérations (≥ 4 caractères, uniques)
	 * et opérations rattachées à un type (uniques par type) — messages legacy S7-16/S7-17.
	 */
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { TypeOperation } from '$lib/types/tarifs-bancaires';

	let { types, form }: { types: TypeOperation[]; form?: Record<string, unknown> | null } = $props();
	const f = $derived(form as { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	const optionsTypes = $derived(types.map((t) => ({ value: t.id, label: t.libelle })));
</script>

<div class="space-y-6">
	<div class="grid gap-4 md:grid-cols-2">
		<Formulaire action="?/ajouterType" {form} cle="type-nouveau" reinitialiser class="carte space-y-3 p-5">
			{#snippet children({ envoi })}
				<h3 class="text-lg font-bold">Nouveau type d'opération</h3>
				<Saisie label="Libellé du type" id="nouveau-type" requis minlength={4} maxlength={120} {...champ(f, 'libelle', '', 'type-nouveau')} />
				<Bouton type="submit" variante="fleuve" chargement={envoi}><Plus class="size-4" aria-hidden="true" />Ajouter le type</Bouton>
			{/snippet}
		</Formulaire>
		<Formulaire action="?/ajouterOperation" {form} cle="operation-nouvelle" reinitialiser class="carte space-y-3 p-5">
			{#snippet children({ envoi })}
				<h3 class="text-lg font-bold">Nouvelle opération</h3>
				<Liste label="Type d'opération" id="nouvelle-operation-type" requis options={optionsTypes} {...champ(f, 'type_id', '', 'operation-nouvelle')} />
				<Saisie label="Libellé de l'opération" id="nouvelle-operation" requis minlength={4} maxlength={120} {...champ(f, 'libelle', '', 'operation-nouvelle')} />
				<Bouton type="submit" variante="fleuve" chargement={envoi}><Plus class="size-4" aria-hidden="true" />Ajouter l'opération</Bouton>
			{/snippet}
		</Formulaire>
	</div>

	<ul class="space-y-3">
		{#each types as t (t.id)}
			<li class="carte p-5">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="font-display text-lg font-bold text-fleuve-800">{t.libelle} <span class="text-sm font-normal text-ardoise">({t.operations.length})</span></h3>
					<Formulaire action="?/supprimerType" confirmer="Supprimer ce type et toutes ses opérations ?">
						{#snippet children({ envoi })}
							<input type="hidden" name="id" value={t.id} />
							<Bouton type="submit" taille="sm" variante="danger" chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Supprimer</Bouton>
						{/snippet}
					</Formulaire>
				</div>
				<details class="mt-2">
					<summary class="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm font-semibold text-fleuve-700"><Pencil class="size-4" aria-hidden="true" />Renommer</summary>
					<Formulaire action="?/modifierType" {form} cle="type-{t.id}" class="mt-2 flex flex-wrap items-end gap-2">
						{#snippet children({ envoi })}
							<input type="hidden" name="id" value={t.id} />
							<Saisie label="Libellé" id="type-{t.id}" class="min-w-60 flex-1" {...champ(f, 'libelle', t.libelle, `type-${t.id}`)} />
							<Bouton type="submit" taille="sm" variante="fleuve" chargement={envoi}>Enregistrer</Bouton>
						{/snippet}
					</Formulaire>
				</details>
				{#if t.operations.length}
					<ul class="mt-3 divide-y divide-fleuve-900/5 border-t border-fleuve-900/5">
						{#each t.operations as op (op.id)}
							<li class="py-2">
								<details>
									<summary class="flex min-h-10 cursor-pointer items-center justify-between gap-2 text-[15px]">
										<span>{op.libelle}</span><span class="inline-flex items-center gap-1 text-sm font-semibold text-fleuve-700"><Pencil class="size-4" aria-hidden="true" />Modifier</span>
									</summary>
									<div class="mt-2 flex flex-wrap items-end gap-2">
										<Formulaire action="?/modifierOperation" {form} cle="operation-{op.id}" class="flex flex-1 flex-wrap items-end gap-2">
											{#snippet children({ envoi })}
												<input type="hidden" name="id" value={op.id} />
												<Liste label="Type" id="operation-type-{op.id}" vide={null} options={optionsTypes} {...champ(f, 'type_id', t.id, `operation-${op.id}`)} />
												<Saisie label="Libellé" id="operation-{op.id}" class="min-w-60 flex-1" {...champ(f, 'libelle', op.libelle, `operation-${op.id}`)} />
												<Bouton type="submit" taille="sm" variante="fleuve" chargement={envoi}>Enregistrer</Bouton>
											{/snippet}
										</Formulaire>
										<Formulaire action="?/supprimerOperation" confirmer="Supprimer cette opération ?">
											{#snippet children({ envoi })}
												<input type="hidden" name="id" value={op.id} />
												<Bouton type="submit" taille="sm" variante="danger" chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Supprimer</Bouton>
											{/snippet}
										</Formulaire>
									</div>
								</details>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
</div>
