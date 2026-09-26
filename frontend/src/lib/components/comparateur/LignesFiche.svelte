<script lang="ts">
	/** Lignes d'une fiche (offres ou demandes) avec modification et retrait (F-S6-21 : seulement
	 * les lignes de cette fiche, retirées par leur seul propriétaire). */
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { entier, fcfa } from '$lib/format';
	import type { Ligne } from '$lib/types/comparateur';

	let {
		titre,
		description,
		lignes,
		lienModifier,
		vide
	}: { titre: string; description: string; lignes: Ligne[]; lienModifier: (id: number) => string; vide: string } = $props();
</script>

<section class="carte p-6" aria-label={titre}>
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h2 class="text-xl font-bold">{titre} <span class="text-base font-normal text-ardoise">({lignes.length})</span></h2>
		<p class="text-sm text-ardoise">{description}</p>
	</div>
	{#if lignes.length}
		<ul class="mt-4 divide-y divide-fleuve-900/5">
			{#each lignes as l (l.id)}
				<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
					<div class="min-w-0 flex-1">
						<p class="font-semibold">{l.produit.nom}</p>
						<p class="text-sm text-ardoise">
							<span class="montant font-semibold text-laterite-700">{fcfa(l.prix)}</span> par {l.unite_vente}
							{#if l.quantite_mensuelle}· {entier(l.quantite_mensuelle)} / mois{/if}
							{#if l.fournisseur_ou_client}· {l.fournisseur_ou_client}{/if}
						</p>
					</div>
					<div class="flex gap-2">
						<Bouton href={lienModifier(l.id)} variante="secondaire" taille="sm"><Pencil class="size-4" aria-hidden="true" />Modifier<span class="sr-only"> {l.produit.nom}</span></Bouton>
						<Formulaire action="?/supprimer" cle="ligne-{l.id}" confirmer="Retirer « {l.produit.nom} » de votre fiche ?">
							{#snippet children({ envoi })}
								<input type="hidden" name="ligne_id" value={l.id} />
								<Bouton type="submit" variante="danger" taille="sm" chargement={envoi}>
									<Trash2 class="size-4" aria-hidden="true" />Retirer<span class="sr-only"> {l.produit.nom}</span>
								</Bouton>
							{/snippet}
						</Formulaire>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-3 text-ardoise">{vide}</p>
	{/if}
</section>
