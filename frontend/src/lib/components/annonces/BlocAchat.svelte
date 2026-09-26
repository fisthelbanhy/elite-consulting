<script lang="ts">
	/** Ajout d'un article au panier (F-S3-34) : quantité de 1 au stock restant, prix figé à l'ajout. */
	import { page } from '$app/state';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import { fcfa } from '$lib/format';
	import type { ArticleDetail } from '$lib/types/annonces';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string } | null | undefined;
	let { article: a, form }: { article: ArticleDetail; form: Retour } = $props();

	const connecte = $derived(!!page.data.membre);
	const reste = $derived(Math.max(0, a.quantite - a.quantite_panier));
	const retour = $derived(form?.cle === 'panier' ? form : null);
	const suite = $derived(encodeURIComponent(page.url.pathname));
	let quantite = $state(1);
</script>

<section class="carte p-5" aria-labelledby="titre-achat">
	<h2 id="titre-achat" class="text-lg font-bold">Acheter cet article</h2>
	<p class="montant mt-1 font-display text-2xl font-extrabold text-laterite-700">{a.prix ? fcfa(a.prix) : 'Prix à débattre'}</p>
	{#if a.quantite_panier}
		<p class="mt-1 text-sm text-foret-700">Déjà {a.quantite_panier} dans votre panier.</p>
	{/if}
	{#if !connecte}
		<p class="mt-2 text-[15px] text-ardoise">Connectez-vous pour l'ajouter à votre panier et payer en toute sécurité via la frangine.</p>
		<div class="mt-4 space-y-2">
			<Bouton href="/connexion?suite={suite}" pleineLargeur><ShoppingCart class="size-5" aria-hidden="true" />Me connecter pour acheter</Bouton>
			<Bouton href="/inscription?suite={suite}" variante="fantome" pleineLargeur>Créer mon compte gratuit</Bouton>
		</div>
	{:else if a.quantite === 0}
		<Alerte type="attention" titre="Article épuisé" class="mt-3">Le vendeur n'a plus de stock pour le moment.</Alerte>
	{:else if reste === 0}
		<Alerte type="info" titre="Tout le stock est déjà dans votre panier." class="mt-3" />
		<Bouton href="/annonces/panier" variante="secondaire" pleineLargeur class="mt-3">Voir mon panier</Bouton>
	{:else}
		<Formulaire action="?/panier" {form} cle="panier" class="mt-3">
			{#snippet children({ envoi })}
				<label for="quantite-achat" class="mb-1.5 block text-[15px] font-semibold">Quantité à prendre</label>
				<select id="quantite-achat" name="quantite" bind:value={quantite} aria-describedby="stock-achat">
					{#each Array.from({ length: Math.min(reste, 50) }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option>{/each}
				</select>
				<p id="stock-achat" class="mt-1 text-sm text-ardoise">{a.quantite} disponible{a.quantite > 1 ? 's' : ''} · total {fcfa(a.prix * quantite)}</p>
				<Bouton type="submit" pleineLargeur chargement={envoi} class="mt-4"><ShoppingCart class="size-5" aria-hidden="true" />Ajouter au panier</Bouton>
			{/snippet}
		</Formulaire>
		{#if retour?.succes}<Bouton href="/annonces/panier" variante="fleuve" pleineLargeur class="mt-3">Voir mon panier et payer</Bouton>{/if}
	{/if}
</section>
