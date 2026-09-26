<script lang="ts">
	import { page } from '$app/state';
	import Package from '@lucide/svelte/icons/package';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Eye from '@lucide/svelte/icons/eye';
	import Share2 from '@lucide/svelte/icons/share-2';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Prix from '$lib/components/boutique/Prix.svelte';
	import EtatStock from '$lib/components/boutique/EtatStock.svelte';
	import SelecteurQuantite from '$lib/components/boutique/SelecteurQuantite.svelte';
	import BandeauDistributeur from '$lib/components/boutique/BandeauDistributeur.svelte';
	import { dateHeure, fcfa, jsonLd, libelle, lienPartageWhatsApp, lienWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.produit);
	const groupe = $derived(libelle(data.enums, 'GroupeProduit', p.groupe) || 'Autres produits Forever');
	const vendable = $derived(p.prix > 0 && p.quantite_stock > 0);
	const wa = $derived(data.parametres.whatsapp);
	const prixListe = $derived(
		[
			{ label: 'Prix public', valeur: p.prix_public, actif: !p.distributeur },
			{ label: 'Prix non distributeur', valeur: p.prix_non_distributeur, actif: false },
			{ label: 'Prix distributeur', valeur: p.prix_distributeur, actif: p.distributeur }
		].filter((x) => x.valeur > 0)
	);
	const donnees = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: p.nom,
			sku: p.reference || undefined,
			brand: { '@type': 'Brand', name: 'Forever Living Products' },
			description: tronquer(p.description, 500) || p.nom,
			image: p.photo_url ? new URL(p.photo_url, page.url).href : undefined,
			category: groupe,
			offers:
				p.prix_public > 0
					? {
							'@type': 'Offer',
							price: p.prix_public,
							priceCurrency: 'XAF',
							availability: p.quantite_stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
							seller: { '@type': 'Organization', name: data.parametres.nom_site }
						}
					: undefined
		})
	);
</script>

<svelte:head>
	<title>{p.nom} — Forever Living — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`${p.nom} (${groupe}) : ${p.description}`, 155)} />
	{@html donnees}
</svelte:head>

<EnTetePage
	titre={p.nom}
	surtitre={groupe}
	fil={[{ href: '/boutique', label: 'Boutique' }, { href: `/boutique?groupe=${p.groupe}`, label: groupe }]}
>
	<Bouton href={lienPartageWhatsApp(`${p.nom} — ${page.url.href}`)} variante="secondaire" target="_blank" rel="noopener">
		<Share2 class="size-5" aria-hidden="true" />Partager
	</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
	<div class="carte aspect-square overflow-hidden bg-white">
		{#if p.photo_url}
			<img src={p.photo_url} alt={p.nom} width="600" height="600" class="size-full object-contain p-6" />
		{:else}
			<div class="grid size-full place-items-center bg-sable text-fleuve-200"><Package class="size-24" aria-hidden="true" /></div>
		{/if}
	</div>

	<div class="space-y-6">
		<div class="flex flex-wrap items-center gap-2">
			{#if p.reference}<Badge ton="fleuve">Réf. {p.reference}</Badge>{/if}
			<Badge>{groupe}</Badge>
			<span class="flex items-center gap-1 text-sm text-ardoise"><Eye class="size-4" aria-hidden="true" />{p.nombre_visites} consultation{p.nombre_visites > 1 ? 's' : ''}{#if p.date_derniere_visite} · dernière le {dateHeure(p.date_derniere_visite)}{/if}</span>
		</div>

		<section class="carte space-y-4 p-6" aria-label="Prix et commande">
			<Prix prix={p.prix} prixPublic={p.prix_public} prixDistributeur={p.prix_distributeur} distributeur={p.distributeur} grand />
			{#if prixListe.length > 1}
				<dl class="grid gap-2 text-[15px] sm:grid-cols-3">
					{#each prixListe as x (x.label)}
						<div class="rounded-xl p-3 {x.actif ? 'bg-laterite-50 ring-1 ring-laterite-100' : 'bg-creme'}">
							<dt class="text-sm text-ardoise">{x.label}{#if x.actif} · <strong class="text-laterite-700">votre prix</strong>{/if}</dt>
							<dd class="montant font-semibold">{fcfa(x.valeur)}</dd>
						</div>
					{/each}
				</dl>
			{/if}
			<EtatStock stock={p.quantite_stock} />

			{#if vendable}
				<Formulaire action="?/ajouter" {form} cle="panier">
					{#snippet children({ envoi })}
						<div class="flex flex-wrap items-end gap-3">
							<div>
								<p class="mb-1.5 text-[15px] font-semibold" id="libelle-quantite">Quantité</p>
								<SelecteurQuantite name="quantite_{p.id}" label="Quantité de {p.nom}" valeur={1} min={1} max={Math.min(999, p.quantite_stock)} />
							</div>
							<Bouton type="submit" taille="lg" chargement={envoi} class="flex-1">
								<ShoppingCart class="size-5" aria-hidden="true" />Ajouter au panier
							</Bouton>
						</div>
						{#if form?.cle === 'panier' && form?.succes}
							<p class="mt-3"><a href="/panier" class="lien">Voir mon panier et payer</a></p>
						{/if}
					{/snippet}
				</Formulaire>
				{#if !data.membre}
					<p class="text-sm text-ardoise">Vous serez invité·e à vous connecter (ou à créer votre compte gratuit) pour commander.</p>
				{/if}
			{:else if wa}
				<Bouton
					href={lienWhatsApp(wa, `Bonjour la Frangine, le produit « ${p.nom} » (réf. ${p.reference}) est-il disponible, et à quel prix ?`)}
					variante="whatsapp"
					target="_blank"
					rel="noopener"
					pleineLargeur
				>
					<MessageCircle class="size-5" aria-hidden="true" />{p.prix > 0 ? 'Être prévenu·e du retour en stock' : 'Demander le prix sur WhatsApp'}
				</Bouton>
			{/if}
		</section>

		{#if p.description}
			<section class="carte p-6">
				<h2 class="text-xl font-bold">Description</h2>
				<p class="mt-3 whitespace-pre-line">{p.description}</p>
			</section>
		{/if}

		{#if !p.distributeur}<BandeauDistributeur compact />{/if}
	</div>
</div>
