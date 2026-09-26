<script lang="ts">
	import { page } from '$app/state';
	import Share2 from '@lucide/svelte/icons/share-2';
	import FileText from '@lucide/svelte/icons/file-text';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import Echeance from '$lib/components/marches/Echeance.svelte';
	import AlerteWhatsApp from '$lib/components/marches/AlerteWhatsApp.svelte';
	import { date, fcfa, jsonLd, lienPartageWhatsApp, lienWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const m = $derived(data.marche);
	const type = $derived(m.type_marche === 2 ? 'Marché public' : 'Marché privé');
	const partage = $derived(lienPartageWhatsApp(`Appel d'offres : ${m.libelle} (${fcfa(m.montant)}) — ${page.url.href}`));
	const aide = $derived(
		lienWhatsApp(
			data.parametres.whatsapp,
			`Bonjour la Frangine, je souhaite être accompagné·e pour répondre à l'appel d'offres n° ${m.numero_appel_offre} (${m.reference}) : ${m.libelle}.`
		)
	);
	const description = $derived(
		tronquer(`${type} n° ${m.numero_appel_offre} : ${m.libelle}. Montant ${fcfa(m.montant)}${m.date_limite ? `, date limite ${date(m.date_limite)}` : ''}.`, 155)
	);

	// « Demand » (schema.org) : annonce publique d'un besoin de biens ou de services
	const donneesStructurees = $derived(
		jsonLd([
			{
				'@context': 'https://schema.org',
				'@type': 'Demand',
				name: m.libelle,
				description: m.description || m.libelle,
				identifier: m.numero_appel_offre,
				url: page.url.href,
				availabilityEnds: m.date_limite ?? undefined,
				areaServed: { '@type': 'Country', name: 'République du Congo' },
				priceSpecification: { '@type': 'PriceSpecification', price: m.montant, priceCurrency: 'XAF' },
				seller: m.maitre_ouvrage ? { '@type': 'Organization', name: m.maitre_ouvrage } : undefined
			},
			{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Opportunités', item: `${page.url.origin}/opportunites` },
					{ '@type': 'ListItem', position: 2, name: 'Marchés et appels d’offres', item: `${page.url.origin}/marches` },
					{ '@type': 'ListItem', position: 3, name: m.libelle, item: page.url.href }
				]
			}
		])
	);
</script>

<svelte:head>
	<title>{tronquer(m.libelle, 70)} — Appel d'offres {m.numero_appel_offre} — {data.parametres.nom_site}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="Appel d'offres : {m.libelle}" />
	<meta property="og:description" content={description} />
	{#if m.etat === 2}{@html donneesStructurees}{:else}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<EnTetePage titre={m.libelle} surtitre={type} fil={[{ href: '/marches', label: 'Marchés et projets' }]}>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Opération effectuée avec succès.">Référence {m.reference}. L'appel d'offres est publié.</Alerte>{/if}
		{#if data.fichierRefuse}
			<Alerte type="attention" titre="Le document n'a pas été accepté.">Seuls les fichiers PDF de 4 Mo maximum sont acceptés. Réessayez depuis « Modifier la fiche ».</Alerte>
		{/if}

		<section class="carte space-y-4 p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<Echeance jours={m.jours_restants} dateLimite={m.date_limite} etat={m.etat} complet />
				<p class="montant font-display text-2xl font-bold text-laterite-700"><span class="sr-only">Montant : </span>{fcfa(m.montant)}</p>
			</div>
			<dl class="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
				<div><dt class="text-ardoise">N° d'appel d'offres</dt><dd class="font-semibold break-words">{m.numero_appel_offre}</dd></div>
				<div><dt class="text-ardoise">Référence</dt><dd class="font-semibold">{m.reference}</dd></div>
				{#if m.maitre_ouvrage}<div><dt class="text-ardoise">Maître d'ouvrage</dt><dd class="font-semibold">{m.maitre_ouvrage}</dd></div>{/if}
				{#if m.beneficiaire}<div><dt class="text-ardoise">Bénéficiaire</dt><dd class="font-semibold">{m.beneficiaire}</dd></div>{/if}
				{#if m.publie_par}<div><dt class="text-ardoise">Publié par</dt><dd class="font-semibold">{m.publie_par}</dd></div>{/if}
				<div><dt class="text-ardoise">En ligne depuis le</dt><dd class="font-semibold">{date(m.date_creation)}</dd></div>
			</dl>
			<div class="flex flex-wrap gap-2"><Badge ton={m.type_marche === 2 ? 'fleuve' : 'soleil'}>{type}</Badge></div>
		</section>

		{#if m.description}
			<section class="carte p-6">
				<h2 class="text-xl font-bold">Description du marché</h2>
				<p class="mt-3 whitespace-pre-line">{m.description}</p>
			</section>
		{/if}

		<section class="carte space-y-4 p-6">
			<h2 class="text-xl font-bold">Comment soumissionner</h2>
			{#if m.dossier_a_fournir}
				<div>
					<h3 class="text-base font-bold">Dossier à fournir</h3>
					<p class="mt-1 whitespace-pre-line">{m.dossier_a_fournir}</p>
				</div>
			{/if}
			<ul class="space-y-2.5 text-[15px]">
				{#if m.lieu_depot}<li class="flex items-start gap-2"><MapPin class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" /><span><span class="font-semibold">Lieu de dépôt :</span> {m.lieu_depot}</span></li>{/if}
				{#if m.email}
					<li class="flex items-start gap-2">
						<Mail class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" />
						<a href="mailto:{m.email}?subject={encodeURIComponent(`Appel d'offres n° ${m.numero_appel_offre}`)}" class="lien break-all">{m.email}</a>
					</li>
				{/if}
			</ul>
			{#if m.document_url}
				<Bouton href={m.document_url} variante="secondaire" target="_blank" rel="noopener"><FileText class="size-5" aria-hidden="true" />Télécharger le dossier (PDF)</Bouton>
			{/if}
			{#if !m.dossier_a_fournir && !m.lieu_depot && !m.email && !m.document_url}
				<p class="text-ardoise">Les modalités de dépôt ne sont pas précisées : votre frangine peut se renseigner pour vous.</p>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		{#if data.parametres.whatsapp && m.ouvert}
			<section class="carte space-y-3 p-5">
				<h2 class="flex items-center gap-2 text-lg font-bold"><LifeBuoy class="size-5 text-laterite-600" aria-hidden="true" />Répondre à ce marché</h2>
				<p class="text-[15px] text-ardoise">Pièces administratives, offre technique et financière : on vous aide à monter un dossier complet, dans les délais.</p>
				<Bouton href={aide} target="_blank" rel="noopener" pleineLargeur>Me faire accompagner</Bouton>
			</section>
		{/if}
		<AlerteWhatsApp compact />
		<PanneauModeration etat={m.etat} peutModerer={m.peut_moderer} peutModifier={m.peut_modifier} lienModifier="/marches/{m.id}/modifier" {form} />
	</aside>
</div>
