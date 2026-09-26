<script lang="ts">
	/** Fiche produit : groupe FLP, référence, nom, description, 3 prix, stock, état, photo (F-ADM-25). */
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';

	let { data, form } = $props();
	const p = $derived(data.produit);
	// Les groupes hors liste de la reprise (0, 100) restent sélectionnables sur leurs produits
	const groupes = $derived.by(() => {
		const liste = [...(data.enums.GroupeProduit ?? [])];
		if (p && !liste.some((g) => g.value === p.groupe)) liste.push({ value: p.groupe, label: `Groupe ${p.groupe} (reprise)` });
		return liste;
	});
</script>

<svelte:head>
	<title>{p ? p.nom : 'Nouveau produit'} — Produits — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion
	titre={p ? p.nom : 'Nouveau produit'}
	fil={[
		{ href: '/gestion/referentiels', label: 'Référentiels' },
		{ href: '/gestion/referentiels/produits', label: 'Produits' },
		{ href: `/gestion/referentiels/produits/${p?.id ?? 'nouveau'}`, label: p ? 'Modifier' : 'Nouveau' }
	]}
/>

<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
	<Formulaire {form} fichiers>
		{#snippet children({ envoi })}
			<div class="space-y-6">
				<fieldset class="carte space-y-5 p-5">
					<legend class="sr-only">Produit</legend>
					<div class="grid gap-5 sm:grid-cols-2">
						<Liste label="Groupe" requis options={groupes} {...champ(form, 'groupe', p?.groupe)} />
						<Saisie label="Référence" {...champ(form, 'reference', p?.reference)} />
					</div>
					<Saisie label="Nom du produit" requis aide="3 caractères minimum ; unique dans son groupe." {...champ(form, 'nom', p?.nom)} />
					<Zone label="Description" lignes={5} {...champ(form, 'description', p?.description)} />
				</fieldset>
				<fieldset class="carte space-y-5 p-5">
					<legend class="text-lg font-bold">Prix et stock</legend>
					<div class="grid gap-5 sm:grid-cols-3">
						<Saisie label="Prix distributeur" type="number" min="0" suffixe="FCFA" {...champ(form, 'prix_distributeur', p?.prix_distributeur ?? 0)} />
						<Saisie label="Prix non distributeur" type="number" min="0" suffixe="FCFA" {...champ(form, 'prix_non_distributeur', p?.prix_non_distributeur ?? 0)} />
						<Saisie label="Prix public" type="number" min="0" suffixe="FCFA" {...champ(form, 'prix_public', p?.prix_public ?? 0)} />
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<Saisie label="Quantité en stock" type="number" min="0" {...champ(form, 'quantite_stock', p?.quantite_stock ?? 0)} />
						<Liste
							label="État"
							vide={null}
							options={[{ value: 1, label: 'Non traité' }, { value: 2, label: 'Autorisé (en vente)' }, { value: 3, label: 'Supprimé' }]}
							{...champ(form, 'etat', p && p.etat <= 3 ? p.etat : 2)}
						/>
					</div>
				</fieldset>
				<fieldset class="carte p-5">
					<legend class="sr-only">Photo</legend>
					<Fichier label="Photo du produit" name="photo" actuel={p?.photo_url} erreur={form?.champs?.photo} />
				</fieldset>
				<div class="flex flex-wrap gap-3">
					<Bouton type="submit" taille="lg" chargement={envoi}>{p ? 'Enregistrer' : 'Créer le produit'}</Bouton>
					<Bouton href="/gestion/referentiels/produits" variante="fantome" taille="lg">Annuler</Bouton>
				</div>
			</div>
		{/snippet}
	</Formulaire>
</div>
