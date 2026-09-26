<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import CarteMarche from '$lib/components/marches/CarteMarche.svelte';
	import AlerteWhatsApp from '$lib/components/marches/AlerteWhatsApp.svelte';
	import CarteEntreprise from '$lib/components/entreprises/CarteEntreprise.svelte';
	import LiensPilier from '$lib/components/entreprises/LiensPilier.svelte';
	import { PILIERS, liensVisibles } from '$lib/navigation';
	import { entier, jsonLd, lienWhatsApp } from '$lib/format';
	import { page } from '$app/state';

	let { data } = $props();
	const pilier = PILIERS.find((p) => p.id === 'opportunites') ?? PILIERS[2];
	const liens = $derived(liensVisibles(pilier.liens, data.parametres));
	const c = $derived(data.compteurs);
	const pluriel = (n: number, mot: string) => `${entier(n)} ${mot}${n > 1 ? 's' : ''}`;
	const compteurs = $derived({
		'/marches': c?.marches_ouverts ? `${pluriel(c.marches_ouverts, 'marché')} ouvert${c.marches_ouverts > 1 ? 's' : ''}` : undefined,
		'/emplois': data.emplois?.offres ? pluriel(data.emplois.offres, 'offre') : undefined,
		'/entreprises': data.entreprises.total ? pluriel(data.entreprises.total, 'entreprise') : undefined
	});
	const wa = $derived(
		lienWhatsApp(data.parametres.whatsapp, "Bonjour la Frangine, je cherche des opportunités (clients, marchés, partenaires) pour mon activité.")
	);
	const donneesStructurees = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'CollectionPage',
			name: `${pilier.titre} — ${data.parametres.nom_site}`,
			url: page.url.href,
			hasPart: liens.map((l) => ({ '@type': 'WebPage', name: l.label, description: l.description, url: `${page.url.origin}${l.href}` }))
		})
	);
</script>

<svelte:head>
	<title>Opportunités d'affaires au Congo : marchés, emplois, clients — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Appels d'offres publics et privés, emplois, annuaire des entreprises, comparateur de prix, immobilier et petites annonces à Brazzaville et Pointe-Noire : toutes les opportunités au même endroit."
	/>
	{@html donneesStructurees}
</svelte:head>

<section class="relative overflow-hidden border-b border-fleuve-900/5 bg-white">
	<div class="pagne pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-50 lg:block" aria-hidden="true"></div>
	<div class="conteneur relative py-10 sm:py-14">
		<nav aria-label="Fil d'Ariane" class="mb-3 text-sm text-ardoise"><a href="/" class="hover:text-fleuve-700">Accueil</a> › Opportunités</nav>
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">{pilier.titre}</p>
		<h1 class="mt-2 max-w-3xl text-[clamp(2rem,7vw,3.25rem)] leading-tight font-extrabold">
			Marchés, emplois, clients : <span class="text-laterite-600">les bonnes opportunités au bon moment.</span>
		</h1>
		<p class="mt-4 max-w-2xl text-lg text-ardoise">
			Des appels d'offres lisibles sur mobile, des entreprises à contacter en un clic, des offres d'emploi et des annonces
			à Brazzaville et Pointe-Noire. Et votre frangine pour vous aider à saisir la bonne.
		</p>
		<div class="mt-7 flex flex-col gap-3 sm:flex-row">
			<Bouton href="/marches" taille="lg">Voir les appels d'offres <ArrowRight class="size-5" aria-hidden="true" /></Bouton>
			{#if data.parametres.whatsapp}
				<Bouton href={wa} variante="whatsapp" taille="lg" target="_blank" rel="noopener">
					<MessageCircle class="size-5" aria-hidden="true" />Parler à une conseillère
				</Bouton>
			{/if}
		</div>
	</div>
</section>

<div class="conteneur space-y-14 py-10">
	<section aria-labelledby="rubriques">
		<h2 id="rubriques" class="text-2xl font-bold">Toutes les opportunités</h2>
		<p class="mt-1 text-ardoise">{pilier.accroche}.</p>
		<div class="mt-5"><LiensPilier {liens} {compteurs} /></div>
	</section>

	<section aria-labelledby="marches">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 id="marches" class="text-2xl font-bold">{data.marchesOuverts ? "Appels d'offres ouverts" : "Derniers appels d'offres"}</h2>
				<p class="mt-1 text-ardoise">{data.marchesOuverts ? 'Les dates limites les plus proches en premier.' : 'Soyez prévenu·e des prochains dès leur publication.'}</p>
			</div>
			<a href={data.marchesOuverts ? '/marches?ouverts=1&tri=cloture' : '/marches'} class="lien">Tous les marchés</a>
		</div>
		{#if data.marches.items.length}
			<ul class="mt-5 grid gap-4 md:grid-cols-3">
				{#each data.marches.items as m (m.id)}<li><CarteMarche marche={m} /></li>{/each}
			</ul>
		{/if}
		<div class="mt-6"><AlerteWhatsApp /></div>
	</section>

	{#if data.entreprises.items.length}
		<section aria-labelledby="entreprises">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="entreprises" class="text-2xl font-bold">Entreprises récemment inscrites</h2>
					<p class="mt-1 text-ardoise">Fournisseurs, prestataires et partenaires près de chez vous.</p>
				</div>
				<a href="/entreprises" class="lien">Tout l'annuaire</a>
			</div>
			<ul class="mt-5 grid gap-4 md:grid-cols-2">
				{#each data.entreprises.items as e (e.id)}<li><CarteEntreprise entreprise={e} /></li>{/each}
			</ul>
		</section>
	{/if}

	<section class="carte grid gap-6 p-6 sm:p-8 md:grid-cols-3" aria-labelledby="aussi">
		<h2 id="aussi" class="text-xl font-bold md:col-span-3">Vous cherchez aussi…</h2>
		<a href="/emplois" class="group rounded-2xl bg-creme p-5 hover:bg-sable">
			<p class="font-display text-lg font-bold text-fleuve-800">Un emploi, un profil</p>
			<p class="mt-1 text-[15px] text-ardoise">Offres d'emploi et candidats, publiés gratuitement.{#if data.emplois?.offres} {pluriel(data.emplois.offres, 'offre')} en ligne.{/if}</p>
		</a>
		<a href="/annonces" class="group rounded-2xl bg-creme p-5 hover:bg-sable">
			<p class="font-display text-lg font-bold text-fleuve-800">Une bonne affaire</p>
			<p class="mt-1 text-[15px] text-ardoise">Articles neufs et d'occasion entre particuliers et professionnels.</p>
		</a>
		<a href="/immobilier" class="group rounded-2xl bg-creme p-5 hover:bg-sable">
			<p class="font-display text-lg font-bold text-fleuve-800">Un local, une maison</p>
			<p class="mt-1 text-[15px] text-ardoise">Location, vente et recherche de biens à Brazzaville et Pointe-Noire.</p>
		</a>
	</section>

	<section class="flex flex-col items-start gap-4 rounded-carte bg-foret-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
		<div>
			<h2 class="text-xl font-bold text-foret-700">Vous avez une entreprise ?</h2>
			<p class="mt-1 text-[15px] text-encre/80">Inscrivez-la gratuitement : fiche dans l'annuaire, accès au comparateur de prix et aux marchés.</p>
		</div>
		<Bouton href="/entreprises/nouvelle" variante="fleuve" class="shrink-0">Inscrire mon entreprise</Bouton>
	</section>
</div>
