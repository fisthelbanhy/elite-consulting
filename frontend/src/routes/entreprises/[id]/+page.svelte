<script lang="ts">
	import { page } from '$app/state';
	import Eye from '@lucide/svelte/icons/eye';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Scale from '@lucide/svelte/icons/scale';
	import Handshake from '@lucide/svelte/icons/handshake';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import LogoEntreprise from '$lib/components/entreprises/LogoEntreprise.svelte';
	import ContactEntreprise from '$lib/components/entreprises/ContactEntreprise.svelte';
	import { lienSite } from '$lib/components/entreprises/outils';
	import { date, dateHeure, fcfa, jsonLd, libelle, lienPartageWhatsApp, lienWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const e = $derived(data.entreprise);
	const forme = $derived(libelle(data.enums, 'FormeJuridique', e.forme_juridique));
	const ville = $derived(e.ville?.nom ?? 'Brazzaville');
	const estAuteur = $derived(!!data.membre && e.auteur?.id === data.membre.id);
	const presence = $derived(e.comparateur.offres + e.comparateur.demandes);
	const partage = $derived(lienPartageWhatsApp(`${e.nom} — ${e.domaine?.libelle ?? 'entreprise'} à ${ville} : ${page.url.href}`));
	const description = $derived(
		tronquer(e.description || `${e.nom}${forme ? ` (${forme})` : ''}, ${e.domaine?.libelle ?? 'entreprise'} à ${ville}. Coordonnées et contact dans l'annuaire.`, 155)
	);

	const donneesStructurees = $derived(
		jsonLd([
			{
				'@context': 'https://schema.org',
				'@type': 'LocalBusiness',
				name: e.nom,
				description: e.description || undefined,
				identifier: e.reference,
				image: e.logo_url ? new URL(e.logo_url, page.url.origin).href : undefined,
				logo: e.logo_url ? new URL(e.logo_url, page.url.origin).href : undefined,
				telephone: e.telephone ? `+242${e.telephone}` : undefined,
				email: e.email || undefined,
				url: lienSite(e.site_web) ?? page.url.href,
				address: { '@type': 'PostalAddress', streetAddress: e.adresse || undefined, addressLocality: ville, addressCountry: 'CG' },
				knowsAbout: e.domaine?.libelle
			},
			{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Opportunités', item: `${page.url.origin}/opportunites` },
					{ '@type': 'ListItem', position: 2, name: 'Annuaire des entreprises', item: `${page.url.origin}/entreprises` },
					{ '@type': 'ListItem', position: 3, name: e.nom, item: page.url.href }
				]
			}
		])
	);
</script>

<svelte:head>
	<title>{e.nom}{forme ? ` (${forme})` : ''} — {e.domaine?.libelle ?? 'Entreprise'} à {ville} — {data.parametres.nom_site}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="{e.nom} — {e.domaine?.libelle ?? 'Entreprise'} à {ville}" />
	<meta property="og:description" content={description} />
	{#if e.logo_url}<meta property="og:image" content={new URL(e.logo_url, page.url.origin).href} />{/if}
	{#if e.etat === 2}{@html donneesStructurees}{:else}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<EnTetePage
	titre={e.nom}
	surtitre={e.domaine?.secteur?.libelle ?? 'Entreprise'}
	fil={[
		{ href: '/entreprises', label: 'Annuaire' },
		...(e.domaine?.secteur ? [{ href: `/entreprises?secteur_id=${e.domaine.secteur.id}`, label: e.domaine.secteur.libelle }] : [])
	]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre="La fiche de votre entreprise est enregistrée.">Référence {e.reference}. Vous pouvez la modifier à tout moment.</Alerte>
		{/if}
		{#if data.fichierRefuse}
			<Alerte type="attention" titre="Le logo n'a pas été accepté.">
				Formats acceptés : JPG, PNG ou WebP, 4 Mo maximum. Vous pouvez en envoyer un autre depuis « Modifier la fiche ».
			</Alerte>
		{/if}

		<section class="carte p-6">
			<div class="flex flex-wrap items-start gap-5">
				<LogoEntreprise src={e.logo_url} nom={e.nom} taille="lg" />
				<div class="min-w-0 flex-1 space-y-3">
					<div class="flex flex-wrap gap-2">
						{#if forme}<Badge ton="fleuve">{forme}</Badge>{/if}
						{#if e.domaine}<Badge>{e.domaine.libelle}</Badge>{/if}
						<Badge>{e.reference}</Badge>
					</div>
					<dl class="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
						{#if e.gerant}<div><dt class="text-ardoise">Gérance</dt><dd class="font-semibold">{e.gerant}</dd></div>{/if}
						{#if e.capital_social > 0}<div><dt class="text-ardoise">Capital social</dt><dd class="montant font-semibold">{fcfa(e.capital_social)}</dd></div>{/if}
						<div><dt class="text-ardoise">Ville</dt><dd class="font-semibold">{ville}</dd></div>
						<div><dt class="text-ardoise">Inscrite le</dt><dd class="font-semibold">{date(e.date_creation)}</dd></div>
						<div>
							<dt class="text-ardoise">Consultations</dt>
							<dd class="flex flex-wrap items-center gap-1 font-semibold">
								<Eye class="size-4" aria-hidden="true" />{e.nombre_visites}
								{#if e.date_derniere_visite}<span class="font-normal text-ardoise">· dernière le {dateHeure(e.date_derniere_visite)}</span>{/if}
							</dd>
						</div>
						{#if e.auteur}<div><dt class="text-ardoise">Fiche publiée par</dt><dd class="font-semibold">{e.auteur.pseudonyme}</dd></div>{/if}
					</dl>
				</div>
			</div>
		</section>

		<section class="carte p-6">
			<h2 class="text-xl font-bold">Activité</h2>
			{#if e.description}
				<p class="mt-3 whitespace-pre-line">{e.description}</p>
			{:else}
				<p class="mt-3 text-ardoise">L'entreprise n'a pas encore décrit son activité.</p>
			{/if}
		</section>

		{#if presence > 0 || estAuteur}
			<section class="carte flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
				<span class="grid size-12 shrink-0 place-items-center rounded-xl bg-soleil-100 text-encre"><Scale class="size-6" aria-hidden="true" /></span>
				<div class="flex-1">
					<h2 class="text-lg font-bold">Comparateur de prix</h2>
					<p class="text-[15px] text-ardoise">
						{#if presence > 0}
							{e.comparateur.offres} offre{e.comparateur.offres > 1 ? 's' : ''} et {e.comparateur.demandes} demande{e.comparateur.demandes > 1 ? 's' : ''}
							publiées, consultables par les comptes entreprise.
						{:else}
							Publiez ce que vous vendez et ce que vous achetez pour être trouvé·e par les autres entreprises.
						{/if}
					</p>
				</div>
				<Bouton
					href={estAuteur ? `/comparateur-prix/ma-fiche?entreprise=${e.id}` : `/comparateur-prix?entreprise_id=${e.id}`}
					variante="secondaire"
					class="shrink-0"
				>
					{estAuteur ? 'Gérer mes prix' : 'Voir ses prix'}
				</Bouton>
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		<ContactEntreprise entreprise={e} />

		{#if !estAuteur && data.parametres.whatsapp}
			<section class="carte space-y-3 p-5">
				<h2 class="flex items-center gap-2 text-lg font-bold"><Handshake class="size-5 text-fleuve-600" aria-hidden="true" />C'est votre entreprise ?</h2>
				<p class="text-[15px] text-ardoise">Complétez sa fiche, ajoutez votre logo et publiez vos prix : votre frangine vous en confie la gestion.</p>
				<Bouton
					href={lienWhatsApp(data.parametres.whatsapp, `Bonjour la Frangine, je représente l'entreprise ${e.nom} (${e.reference}) et je souhaite gérer sa fiche.`)}
					variante="whatsapp"
					target="_blank"
					rel="noopener"
					pleineLargeur
				>
					Réclamer cette fiche
				</Bouton>
			</section>
		{/if}

		<PanneauModeration
			etat={e.etat}
			peutModerer={e.peut_moderer}
			peutModifier={e.peut_modifier}
			lienModifier="/entreprises/{e.id}/modifier"
			{form}
		/>
	</aside>
</div>
