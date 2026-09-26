<script lang="ts">
	/**
	 * Fiche bien-être : libellé, description, état et produits conseillés (ADR-0007 S1b : une seule
	 * liste, celle que voit le public ; ADR-0009 : « conseil d'utilisation » plutôt que posologie).
	 */
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import ConseilsProduits from '$lib/components/gestion/ConseilsProduits.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { champ, valeur } from '$lib/forms';

	let { data, form } = $props();
	const m = $derived(data.maladie);
	const initiales = $derived(
		valeur(form, 'produits', m?.produits.map((p) => ({ produit_id: p.produit_id, posologie: p.posologie })) ?? []) as {
			produit_id: number;
			posologie: string;
		}[]
	);
</script>

<svelte:head>
	<title>{m ? m.libelle : 'Nouvelle fiche'} — Fiches bien-être — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion
	titre={m ? m.libelle : 'Nouvelle fiche bien-être'}
	fil={[
		{ href: '/gestion/referentiels', label: 'Référentiels' },
		{ href: '/gestion/referentiels/maladies', label: 'Fiches bien-être' },
		{ href: `/gestion/referentiels/maladies/${m?.id ?? 'nouveau'}`, label: m ? 'Modifier' : 'Nouvelle' }
	]}
/>

<div class="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
	<Alerte type="attention" titre="Rappel affiché au public">
		Informations fournies à titre indicatif, elles ne remplacent pas l'avis d'un professionnel de santé. Évitez toute promesse de guérison.
	</Alerte>
	<Formulaire {form}>
		{#snippet children({ envoi })}
			<div class="space-y-6">
				<div class="carte space-y-5 p-5">
					<div class="grid gap-5 sm:grid-cols-[1fr_12rem]">
						<Saisie label="Besoin / maladie" requis aide="5 caractères minimum." {...champ(form, 'libelle', m?.libelle)} />
						<Liste
							label="État"
							vide={null}
							options={[{ value: 1, label: 'Non traitée' }, { value: 2, label: 'Publiée' }, { value: 3, label: 'Supprimée' }]}
							{...champ(form, 'etat', m?.etat ?? 2)}
						/>
					</div>
					<Zone label="Description" lignes={4} {...champ(form, 'description', m?.description)} />
				</div>
				<div class="carte p-5">
					{#key initiales}
						<ConseilsProduits {initiales} produits={data.produits} erreurs={form?.champs ?? {}} />
					{/key}
				</div>
				<div class="flex flex-wrap gap-3">
					<Bouton type="submit" taille="lg" chargement={envoi}>{m ? 'Enregistrer' : 'Créer la fiche'}</Bouton>
					<Bouton href="/gestion/referentiels/maladies" variante="fantome" taille="lg">Annuler</Bouton>
				</div>
			</div>
		{/snippet}
	</Formulaire>
</div>
