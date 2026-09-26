<script lang="ts">
	import { page } from '$app/state';
	import Eye from '@lucide/svelte/icons/eye';
	import Package from '@lucide/svelte/icons/package';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import BlocAchat from '$lib/components/annonces/BlocAchat.svelte';
	import BlocInteret from '$lib/components/annonces/BlocInteret.svelte';
	import InteretsRecus from '$lib/components/annonces/InteretsRecus.svelte';
	import Vignette from '$lib/components/annonces/Vignette.svelte';
	import { date, fcfa, jsonLd, lienPartageWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const a = $derived(data.article);
	const offre = $derived(a.offre_ou_recherche === 1);
	const prix = $derived(a.prix ? (offre ? fcfa(a.prix) : `Budget ${fcfa(a.prix)}`) : 'Prix à débattre');
	const partage = $derived(lienPartageWhatsApp(`${a.libelle} — ${prix} : ${page.url.href}`));
	const caracteristiques = $derived(
		[
			['Référence', a.reference],
			['Famille', a.famille?.libelle ?? ''],
			['État', a.neuf_ou_occasion === 1 ? 'Neuf' : 'Occasion'],
			[offre ? 'Disponible' : 'Quantité recherchée', a.quantite ? String(a.quantite) : offre ? 'Épuisé' : ''],
			['Publiée le', date(a.date_creation)],
			['Publiée par', a.auteur?.pseudonyme ?? '']
		].filter(([, v]) => v)
	);
	const donneesStructurees = $derived(
		offre && a.etat === 2 && a.prix
			? jsonLd({
					'@context': 'https://schema.org',
					'@type': 'Product',
					name: a.libelle,
					description: tronquer(a.description, 300) || a.libelle,
					sku: a.reference,
					category: a.famille?.libelle,
					image: a.photo_url ? new URL(a.photo_url, page.url.origin).href : undefined,
					offers: {
						'@type': 'Offer',
						price: a.prix,
						priceCurrency: 'XAF',
						url: page.url.href,
						availability: a.quantite > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
						itemCondition: a.neuf_ou_occasion === 1 ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition'
					}
				})
			: null
	);
</script>

<svelte:head>
	<title>{a.libelle} — {prix} ({a.reference}) — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`${offre ? 'À vendre' : 'Recherché'} : ${a.libelle}, ${a.neuf_ou_occasion === 1 ? 'neuf' : "d'occasion"}, ${prix}. ${a.description}`, 155)} />
	{#if a.photo_url}<meta property="og:image" content={new URL(a.photo_url, page.url.origin).href} />{/if}
	{#if a.etat !== 2}<meta name="robots" content="noindex" />{/if}
	{#if donneesStructurees}{@html donneesStructurees}{/if}
</svelte:head>

<EnTetePage
	titre={a.libelle}
	surtitre={offre ? 'Article à vendre' : 'Article recherché'}
	fil={[{ href: '/annonces', label: 'Petites annonces' }, { href: `/annonces?type=${a.offre_ou_recherche}`, label: offre ? 'À vendre' : 'Recherchés' }]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="min-w-0 space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Votre annonce est publiée.">Référence {a.reference}. Partagez-la pour la faire connaître.</Alerte>{/if}

		<section class="carte grid overflow-hidden sm:grid-cols-2">
			{#if a.photo_url}
				<a href={a.photo_url} target="_blank" rel="noopener" aria-label="Agrandir la photo"><Vignette src={a.photo_url} alt={a.libelle} icone={Package} ratio="aspect-square" /></a>
			{:else}
				<Vignette icone={Package} ratio="aspect-square" />
			{/if}
			<div class="p-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge ton={a.neuf_ou_occasion === 1 ? 'foret' : 'neutre'}>{a.neuf_ou_occasion === 1 ? 'Neuf' : 'Occasion'}</Badge>
					{#if a.etat !== 2}<Badge ton="alerte">Non publiée</Badge>{/if}
					<span class="flex items-center gap-1 text-sm text-ardoise"><Eye class="size-4" aria-hidden="true" />{a.nombre_visites}</span>
				</div>
				<p class="montant mt-3 font-display text-3xl font-extrabold text-laterite-700">{prix}</p>
				<dl class="mt-5 space-y-2 text-[15px]">
					{#each caracteristiques as [t, v] (t)}
						<div class="flex justify-between gap-4 border-b border-fleuve-900/5 pb-2"><dt class="text-ardoise">{t}</dt><dd class="text-right font-semibold">{v}</dd></div>
					{/each}
				</dl>
			</div>
		</section>

		{#if a.description}
			<section class="carte p-6">
				<h2 class="text-xl font-bold">Description</h2>
				<p class="mt-3 whitespace-pre-line">{a.description}</p>
			</section>
		{/if}

		{#if a.interets}
			<InteretsRecus interets={a.interets} reference={a.reference} titre="Propositions reçues" />
		{/if}
	</div>

	<aside class="space-y-6">
		{#if a.peut_acheter}
			<BlocAchat article={a} {form} />
		{:else if a.peut_manifester}
			<BlocInteret
				titre="Vous avez cet article ?"
				texte="Proposez-le : la frangine transmet votre message à la personne qui le cherche."
				libelle="Votre intéressement"
				placeholder="État, prix, lieu de retrait…"
				bouton="Proposer mon article"
				deja={a.mon_interet}
				{form}
				messageWhatsApp={`Bonjour la Frangine, je vous contacte au sujet de l'annonce ${a.reference} (${a.libelle}).`}
			/>
		{/if}
		<PanneauModeration etat={a.etat} peutModerer={a.peut_moderer} peutModifier={a.peut_modifier} lienModifier="/annonces/{a.id}/modifier" {form} />
		<Bouton href="/annonces?type={a.offre_ou_recherche}" variante="fantome" pleineLargeur>Voir les autres annonces</Bouton>
	</aside>
</div>
