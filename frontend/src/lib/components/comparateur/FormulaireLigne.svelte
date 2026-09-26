<script lang="ts">
	/** Ajout / modification d'une offre ou d'une demande (S6-4, F-S6-19, F-S6-20) : produit du
	 * catalogue ou nouveau produit tapé (créé à la volée), unité, prix, volume, fournisseur/client. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { Option } from '$lib/types';
	import type { Ligne, Produit } from '$lib/types/comparateur';

	let {
		form,
		produits,
		unites,
		entrepriseId,
		ligne = null,
		annuler
	}: {
		form: Record<string, unknown> | null | undefined;
		produits: Produit[];
		unites: Option[];
		entrepriseId: number;
		ligne?: Ligne | null;
		annuler: string;
	} = $props();

	const f = $derived(form as { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	const options = $derived(produits.map((p) => ({ value: p.id, label: p.nom })));
	const c = (nom: string, initiale: unknown) => champ(f, nom, initiale, 'ligne');
</script>

<Formulaire action="?/enregistrer" {form} cle="ligne" reinitialiser={!ligne} id="formulaire-ligne" class="carte scroll-mt-24 p-6">
	{#snippet children({ envoi })}
		<div class="space-y-5">
			<h2 class="text-xl font-bold">{ligne ? `Modifier : ${ligne.produit.nom}` : 'Ajouter un produit'}</h2>
			<input type="hidden" name="entreprise_id" value={entrepriseId} />
			{#if ligne}<input type="hidden" name="ligne_id" value={ligne.id} />{/if}
			<Choix
				legende="Il s'agit"
				requis
				options={[
					{ value: '1', label: "D'une offre", description: 'Je vends ce produit' },
					{ value: '2', label: "D'une demande", description: "J'achète ce produit" }
				]}
				{...c('offre_ou_demande', String(ligne?.offre_ou_demande ?? '1'))}
			/>
			<div class="grid gap-5 sm:grid-cols-2">
				<Liste label="Produit" options={options} vide="Choisir dans la liste…" {...c('produit_id', ligne?.produit.id)} />
				<Saisie
					label="Ou nouveau produit"
					maxlength={200}
					aide="Si votre produit ne figure pas dans la liste, tapez son nom."
					{...c('nouveau_produit', '')}
				/>
			</div>
			<div class="grid gap-5 sm:grid-cols-3">
				<Saisie label="Unité de vente" requis maxlength={50} list="unites-vente" placeholder="Sac de 50 kg, carton…" {...c('unite_vente', ligne?.unite_vente)} />
				<Saisie label="Prix" requis inputmode="numeric" suffixe="FCFA" {...c('prix', ligne?.prix)} />
				<Saisie label="Quantité mensuelle" inputmode="numeric" aide="Facultatif." {...c('quantite_mensuelle', ligne?.quantite_mensuelle || '')} />
			</div>
			<datalist id="unites-vente">
				{#each unites as u (u.value)}<option value={u.label}></option>{/each}
			</datalist>
			<Saisie
				label="Fournisseur ou client"
				maxlength={200}
				aide="Facultatif : la marque, votre fournisseur ou vos clients de référence."
				{...c('fournisseur_ou_client', ligne?.fournisseur_ou_client)}
			/>
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" chargement={envoi}>{ligne ? 'Enregistrer la modification' : 'Ajouter à ma fiche'}</Bouton>
				{#if ligne}<Bouton href={annuler} variante="fantome">Annuler</Bouton>{/if}
			</div>
		</div>
	{/snippet}
</Formulaire>
