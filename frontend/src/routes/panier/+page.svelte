<script lang="ts">
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import TableauPanier from '$lib/components/boutique/TableauPanier.svelte';
	import SectionArticles from '$lib/components/boutique/SectionArticles.svelte';
	import BandeauDistributeur from '$lib/components/boutique/BandeauDistributeur.svelte';
	import { fcfa } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.panier);
	const articles = $derived(data.articles && data.articles.lignes.length ? data.articles : null);
	const retour = $derived(form?.cle === 'panier' ? form : null);
</script>

<svelte:head>
	<title>Mon panier — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage titre="Mon panier" fil={[{ href: '/boutique', label: 'Boutique' }, { href: '/panier', label: 'Panier' }]}>
	{#if data.membre?.est_gestionnaire}
		<Bouton href="/panier/suivi" variante="secondaire"><ClipboardList class="size-5" aria-hidden="true" />Paniers des membres</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.paye}
			<Alerte type="succes" titre="Paiement enregistré, merci !">
				Votre commande est réservée : notre caisse confirme le paiement puis votre frangine vous contacte pour la remise des
				produits. Suivez vos paiements dans votre espace.
			</Alerte>
		{/if}
		{#if retour?.succes}<Alerte type="succes" titre={retour.succes} />{/if}
		{#if retour?.message && !retour.succes}<Alerte type="erreur" titre={retour.message} />{/if}

		{#if p.lignes.length}
			<section class="carte p-5 sm:p-6" aria-labelledby="titre-produits">
				<h2 id="titre-produits" class="text-xl font-bold">Produits Forever ({p.quantite_totale})</h2>
				{#if p.message}<Alerte type="erreur" titre={p.message} class="mt-4" />{/if}
				<TableauPanier lignes={p.lignes} />
				<p class="flex items-center justify-between border-t border-fleuve-900/10 pt-4 text-lg">
					<span class="font-semibold">Total</span>
					<strong class="montant font-display text-2xl text-laterite-700">{fcfa(p.total)}</strong>
				</p>
			</section>
		{:else if !articles}
			<EtatVide
				icone={ShoppingCart}
				titre="Votre panier est vide"
				texte="Parcourez la boutique : les produits Forever Living à l'aloe vera, commandés auprès de votre frangine."
				messageWhatsApp="Bonjour la Frangine, j'aimerais un conseil pour choisir des produits Forever Living."
			>
				<Bouton href="/boutique">Découvrir la boutique</Bouton>
			</EtatVide>
		{/if}

		{#if articles}<SectionArticles panier={articles} />{/if}
	</div>

	<aside class="space-y-4 lg:sticky lg:top-24 lg:self-start">
		{#if p.lignes.length}
			<div class="carte space-y-4 p-5">
				<div>
					<p class="text-sm text-ardoise">Montant à régler</p>
					<p class="montant font-display text-3xl font-extrabold text-laterite-700">{fcfa(p.total)}</p>
					<p class="mt-1 text-sm text-ardoise">{p.distributeur ? 'Prix distributeur appliqué.' : 'Prix public.'}</p>
				</div>
				{#if p.payable}
					<Bouton href="/paiement/1" pleineLargeur taille="lg">Payer ma commande</Bouton>
					<p class="text-sm text-ardoise">Mobile Money, espèces à notre bureau ou Charden Farell.</p>
				{:else}
					<p class="text-sm font-semibold text-alerte">Ajustez les quantités signalées pour pouvoir payer.</p>
				{/if}
				<Bouton href="/boutique" variante="fantome" pleineLargeur>Continuer mes achats</Bouton>
			</div>
			<div class="flex gap-3 rounded-xl bg-fleuve-50 p-4 text-[15px] text-fleuve-800">
				<ShieldCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
				<p>Le stock est réservé dès la déclaration de votre paiement et restitué si la caisse ne le confirme pas.</p>
			</div>
		{/if}
		{#if !p.distributeur && p.lignes.length}<BandeauDistributeur compact />{/if}
	</aside>
</div>
