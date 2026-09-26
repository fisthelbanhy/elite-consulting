<script lang="ts">
	import { page } from '$app/state';
	import Eye from '@lucide/svelte/icons/eye';
	import House from '@lucide/svelte/icons/house';
	import Lock from '@lucide/svelte/icons/lock';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import BlocInteret from '$lib/components/annonces/BlocInteret.svelte';
	import InteretsRecus from '$lib/components/annonces/InteretsRecus.svelte';
	import Vignette from '$lib/components/annonces/Vignette.svelte';
	import { lieuBien, prixBien, titreBien } from '$lib/components/immobilier/libelles';
	import { date, dateHeure, jsonLd, libelle, lienPartageWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const b = $derived(data.bien);
	const offre = $derived(b.offre_ou_recherche === 1);
	const titre = $derived(titreBien(data.enums, b));
	const lieu = $derived(lieuBien(b));
	const partage = $derived(lienPartageWhatsApp(`${titre}${lieu ? ` — ${lieu}` : ''} — ${prixBien(b)} : ${page.url.href}`));
	const caracteristiques = $derived(
		[
			['Référence', b.reference],
			['Type de bien', libelle(data.enums, 'TypeBien', b.type_bien)],
			['Transaction', libelle(data.enums, 'TypeTransaction', b.type_transaction)],
			[offre ? 'Surface' : 'Surface souhaitée', `${b.surface_m2} m²`],
			['Pièces', b.nombre_pieces ? String(b.nombre_pieces) : ''],
			['Chambres', b.nombre_chambres ? String(b.nombre_chambres) : ''],
			['Situation', offre ? libelle(data.enums, 'SituationBien', b.situation) : ''],
			['Quartier', lieu],
			['Publiée le', date(b.date_creation)],
			['Publiée par', b.auteur?.pseudonyme ?? '']
		].filter(([, v]) => v)
	);
	const donneesStructurees = $derived(
		offre && b.etat === 2
			? jsonLd({
					'@context': 'https://schema.org',
					'@type': 'RealEstateListing',
					name: titre,
					description: tronquer(b.description, 300) || titre,
					url: page.url.href,
					datePosted: b.date_creation,
					image: b.photo_url ? new URL(b.photo_url, page.url.origin).href : undefined,
					identifier: b.reference,
					offers: b.prix
						? { '@type': 'Offer', price: b.prix, priceCurrency: 'XAF', availability: b.situation === 1 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' }
						: undefined,
					contentLocation: lieu ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: b.quartier?.ville?.nom, streetAddress: b.quartier?.nom, addressCountry: 'CG' } } : undefined
				})
			: null
	);
</script>

<svelte:head>
	<title>{titre}{lieu ? ` — ${lieu}` : ''} ({b.reference}) — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`${titre}${lieu ? ` à ${lieu}` : ''}, ${b.surface_m2} m², ${prixBien(b)}. ${b.description}`, 155)} />
	{#if b.photo_url}<meta property="og:image" content={new URL(b.photo_url, page.url.origin).href} />{/if}
	{#if b.etat !== 2}<meta name="robots" content="noindex" />{/if}
	{#if donneesStructurees}{@html donneesStructurees}{/if}
</svelte:head>

<EnTetePage
	{titre}
	surtitre={offre ? 'Offre immobilière' : 'Recherche immobilière'}
	fil={[{ href: '/immobilier', label: 'Immobilier' }, { href: `/immobilier?type=${b.offre_ou_recherche}`, label: offre ? 'Offres' : 'Recherches' }]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="min-w-0 space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre="Votre annonce est publiée.">Référence {b.reference}. Partagez-la sur WhatsApp pour la faire connaître.</Alerte>
		{/if}

		<section class="carte overflow-hidden">
			{#if b.photo_url}
				<a href={b.photo_url} target="_blank" rel="noopener" aria-label="Agrandir la photo">
					<Vignette src={b.photo_url} alt={titre} icone={House} ratio="aspect-[16/10]" />
				</a>
			{:else}
				<Vignette alt="" icone={House} ratio="aspect-[16/7]" />
			{/if}
			<div class="p-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge ton={offre ? 'fleuve' : 'soleil'}>{offre ? 'Offre' : 'Recherche'}</Badge>
					{#if b.etat !== 2}<Badge ton="alerte">Non publiée</Badge>{/if}
					<span class="flex items-center gap-1 text-sm text-ardoise"><Eye class="size-4" aria-hidden="true" />{b.nombre_visites} consultation{b.nombre_visites > 1 ? 's' : ''}</span>
				</div>
				<p class="montant mt-3 font-display text-3xl font-extrabold text-laterite-700">{prixBien(b)}</p>
				{#if lieu}<p class="mt-1 flex items-center gap-1 text-ardoise"><MapPin class="size-4" aria-hidden="true" />{lieu}</p>{/if}
				<dl class="mt-5 grid gap-x-8 gap-y-3 text-[15px] sm:grid-cols-2">
					{#each caracteristiques as [t, v] (t)}
						<div class="flex justify-between gap-4 border-b border-fleuve-900/5 pb-2"><dt class="text-ardoise">{t}</dt><dd class="text-right font-semibold">{v}</dd></div>
					{/each}
				</dl>
			</div>
		</section>

		{#if b.description}
			<section class="carte p-6">
				<h2 class="text-xl font-bold">Description</h2>
				<p class="mt-3 whitespace-pre-line">{b.description}</p>
			</section>
		{/if}

		{#if b.localisation}
			<section class="carte flex gap-3 p-5">
				<Lock class="mt-1 size-5 shrink-0 text-foret-600" aria-hidden="true" />
				<div>
					<h2 class="text-lg font-bold">Adresse précise</h2>
					<p class="text-sm text-ardoise">Visible uniquement par vous et la frangine.</p>
					<p class="mt-1 font-semibold">{b.localisation}</p>
				</div>
			</section>
		{/if}

		{#if b.interets}
			<InteretsRecus interets={b.interets} reference={b.reference} titre={offre ? 'Demandes reçues' : 'Propositions reçues'} />
			{#if b.date_derniere_visite}<p class="text-sm text-ardoise">Dernière consultation : {dateHeure(b.date_derniere_visite)}</p>{/if}
		{/if}
	</div>

	<aside class="space-y-6">
		{#if b.peut_manifester && b.etat === 2}
			<BlocInteret
				titre={offre ? 'Ce bien vous intéresse ?' : 'Vous avez ce bien ?'}
				texte={offre ? 'Présentez votre besoin : la frangine transmet votre message au propriétaire.' : 'Proposez votre bien : la frangine transmet votre message à la personne qui cherche.'}
				libelle={offre ? 'Présentation de votre besoin' : 'Votre intéressement'}
				placeholder={offre ? 'Date de visite souhaitée, nombre de personnes, durée…' : 'Type de bien, quartier, prix, disponibilité…'}
				bouton={offre ? 'Envoyer ma demande' : 'Proposer mon bien'}
				deja={b.mon_interet}
				{form}
				messageWhatsApp={`Bonjour la Frangine, je suis intéressé·e par l'annonce immobilière ${b.reference} (${titre}).`}
			/>
		{/if}
		<PanneauModeration etat={b.etat} peutModerer={b.peut_moderer} peutModifier={b.peut_modifier} lienModifier="/immobilier/{b.id}/modifier" {form} />
		<Bouton href="/immobilier?type={b.offre_ou_recherche}" variante="fantome" pleineLargeur>Voir les autres {offre ? 'offres' : 'recherches'}</Bouton>
	</aside>
</div>
