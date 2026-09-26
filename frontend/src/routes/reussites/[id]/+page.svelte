<script lang="ts">
	import { page } from '$app/state';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Quote from '@lucide/svelte/icons/quote';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import { date, fcfa, jsonLd, lienPartageWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const r = $derived(data.reussite);
	const titre = $derived(tronquer(r.projet, 90));
	const recit = $derived(
		[
			['Ce que j’étais avant', r.situation_avant],
			['Ma vision', r.vision],
			['Mon projet', r.projet],
			['La stratégie mise en place', r.strategie],
			['Les difficultés rencontrées', r.difficultes],
			['Les efforts déployés', r.deploiement_efforts],
			['Le succès', r.succes]
		].filter(([, v]) => v) as [string, string][]
	);
	const donnees = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: titre,
			articleBody: recit.map(([t, v]) => `${t} : ${v}`).join('\n\n'),
			datePublished: r.date_creation,
			author: { '@type': 'Person', name: r.auteur.pseudonyme },
			publisher: { '@type': 'Organization', name: data.parametres.nom_site }
		})
	);
</script>

<svelte:head>
	<title>{titre} — Réussite de {r.auteur.pseudonyme} — {data.parametres.nom_site}</title>
	{#if r.etat === 2}
		<meta name="description" content={tronquer(`${r.auteur.pseudonyme} raconte : ${r.succes || r.projet}`, 155)} />
		{@html donnees}
	{:else}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<EnTetePage titre={titre} surtitre="Ils se sont lancés" fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/reussites', label: 'Réussites' }]}>
	{#if r.etat === 2}
		<Bouton href={lienPartageWhatsApp(`Le parcours de ${r.auteur.pseudonyme} : ${page.url.href}`)} variante="secondaire" target="_blank" rel="noopener">
			<Share2 class="size-5" aria-hidden="true" />Partager
		</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<article class="space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre="Témoignage enregistré.">{r.etat === 2 ? 'Il est publié.' : 'Il sera publié après relecture par la frangine.'}</Alerte>
		{/if}
		{#if r.etat === 1 && (r.est_auteur || r.peut_moderer)}
			<Alerte type="attention" titre="En attente de relecture">Ce témoignage n'est pas encore visible du public.</Alerte>
		{/if}

		<header class="carte flex flex-wrap items-center gap-5 p-6">
			<Avatar src={r.auteur.photo_url} nom={r.auteur.pseudonyme} taille="xl" />
			<div class="min-w-0 flex-1">
				<p class="font-display text-2xl font-bold text-fleuve-800">{r.auteur.pseudonyme}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#if r.secteur}<Badge ton="fleuve">{r.secteur}</Badge>{/if}
					<Badge>{date(r.date_creation)}</Badge>
				</div>
			</div>
		</header>

		{#if r.fond_demarrage || r.besoin_reel_demarrage}
			<dl class="grid gap-4 sm:grid-cols-2">
				{#if r.fond_demarrage}
					<div class="carte p-5"><dt class="text-ardoise">Fonds de démarrage</dt><dd class="montant mt-1 font-display text-2xl font-bold text-fleuve-800">{fcfa(r.fond_demarrage)}</dd></div>
				{/if}
				{#if r.besoin_reel_demarrage}
					<div class="carte p-5"><dt class="text-ardoise">Besoin réel pour démarrer</dt><dd class="montant mt-1 font-display text-2xl font-bold text-fleuve-800">{fcfa(r.besoin_reel_demarrage)}</dd></div>
				{/if}
			</dl>
		{/if}

		<ol class="relative space-y-6 border-l-2 border-sable pl-6">
			{#each recit as [t, v] (t)}
				<li class="relative">
					<span class="absolute top-1.5 -left-[1.95rem] size-4 rounded-full border-4 border-creme bg-laterite-600" aria-hidden="true"></span>
					<h2 class="text-xl font-bold">{t}</h2>
					<p class="mt-2 whitespace-pre-line">{v}</p>
				</li>
			{/each}
		</ol>

		{#if r.conseil}
			<figure class="rounded-3xl bg-fleuve-700 p-6 text-white sm:p-8">
				<Quote class="size-8 text-soleil-300" aria-hidden="true" />
				<blockquote class="mt-3 font-display text-xl leading-snug font-bold text-white sm:text-2xl">{r.conseil}</blockquote>
				<figcaption class="mt-4 text-fleuve-100">Le conseil de {r.auteur.pseudonyme}</figcaption>
			</figure>
		{/if}
	</article>

	<aside class="space-y-6">
		<section class="carte p-5">
			<h2 class="text-lg font-bold">Et vous, par où commencer ?</h2>
			<p class="mt-2 text-[15px] text-ardoise">3 minutes, gratuit, sans compte : votre frangine vous propose les prochaines étapes.</p>
			<Bouton href="/diagnostic" class="mt-4" pleineLargeur>Faire mon diagnostic <ArrowRight class="size-5" aria-hidden="true" /></Bouton>
		</section>
		<PanneauModeration
			etat={r.etat}
			peutModerer={r.peut_moderer}
			peutModifier={r.peut_modifier}
			lienModifier={r.est_auteur ? '/reussites/ma-fiche' : `/reussites/ma-fiche?fiche=${r.id}`}
			{form}
			etats={[
				{ value: 1, label: 'À valider (non traité)' },
				{ value: 2, label: 'Publié' },
				{ value: 4, label: 'Retiré (clôturé)' },
				{ value: 3, label: 'Supprimé' }
			]}
		/>
	</aside>
</div>
