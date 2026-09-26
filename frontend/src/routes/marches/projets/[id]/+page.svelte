<script lang="ts">
	import { page } from '$app/state';
	import Share2 from '@lucide/svelte/icons/share-2';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import AlerteWhatsApp from '$lib/components/marches/AlerteWhatsApp.svelte';
	import { date, jsonLd, lienPartageWhatsApp, lienWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.projet);
	const partage = $derived(lienPartageWhatsApp(`Projet ${p.libelle} — ${p.objet} : ${page.url.href}`));
	const description = $derived(tronquer(`Projet ${p.libelle} (${p.promoteur}) : ${p.objet}. ${p.objectif || p.description}`, 155));
	const duree = $derived(p.duree_mois ? `${p.duree_mois} mois` : 'Moins d’un mois');

	const donneesStructurees = $derived(
		jsonLd([
			{
				'@context': 'https://schema.org',
				'@type': 'Project',
				name: p.libelle,
				description: [p.objet, p.objectif, p.description].filter(Boolean).join('. '),
				identifier: p.reference,
				url: page.url.href,
				funder: p.promoteur ? { '@type': 'Organization', name: p.promoteur } : undefined,
				foundingDate: p.date_lancement ?? undefined,
				address: p.adresse ? { '@type': 'PostalAddress', streetAddress: p.adresse, addressCountry: 'CG' } : undefined
			},
			{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Marchés et projets', item: `${page.url.origin}/marches` },
					{ '@type': 'ListItem', position: 2, name: 'Projets', item: `${page.url.origin}/marches?onglet=projets` },
					{ '@type': 'ListItem', position: 3, name: p.libelle, item: page.url.href }
				]
			}
		])
	);
</script>

<svelte:head>
	<title>Projet {p.libelle} — {tronquer(p.objet, 60)} — {data.parametres.nom_site}</title>
	<meta name="description" content={description} />
	{#if p.etat === 2}{@html donneesStructurees}{:else}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<EnTetePage
	titre={p.libelle}
	sousTitre={p.objet}
	surtitre="Projet"
	fil={[{ href: '/marches', label: 'Marchés et projets' }, { href: '/marches?onglet=projets', label: 'Projets' }]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Votre projet est publié.">Référence {p.reference}. Vous pouvez le modifier à tout moment.</Alerte>{/if}

		<section class="carte space-y-4 p-6">
			<div class="flex flex-wrap gap-2"><Badge ton="foret">Projet</Badge><Badge>{p.reference}</Badge></div>
			<dl class="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
				<div><dt class="text-ardoise">Promoteur</dt><dd class="font-semibold">{p.promoteur}</dd></div>
				<div><dt class="text-ardoise">Responsable</dt><dd class="font-semibold">{p.responsable}</dd></div>
				<div><dt class="text-ardoise">Durée</dt><dd class="font-semibold">{duree}</dd></div>
				<div><dt class="text-ardoise">Date de lancement</dt><dd class="font-semibold">{p.date_lancement ? date(p.date_lancement) : 'Non précisée'}</dd></div>
				{#if p.adresse}<div class="sm:col-span-2"><dt class="text-ardoise">Adresse</dt><dd class="font-semibold">{p.adresse}</dd></div>{/if}
			</dl>
		</section>

		{#each [['Objectif', p.objectif], ['Description du projet', p.description], ["Conditions d'éligibilité", p.conditions]] as [t, v] (t)}
			{#if v}
				<section class="carte p-6">
					<h2 class="text-xl font-bold">{t}</h2>
					<p class="mt-3 whitespace-pre-line">{v}</p>
				</section>
			{/if}
		{/each}
	</div>

	<aside class="space-y-6">
		{#if data.parametres.whatsapp}
			<section class="carte space-y-3 p-5">
				<h2 class="text-lg font-bold">Ce projet vous concerne ?</h2>
				<p class="text-[15px] text-ardoise">Votre frangine vous met en relation avec les porteurs du projet et vous aide à préparer votre candidature.</p>
				<Bouton
					href={lienWhatsApp(data.parametres.whatsapp, `Bonjour la Frangine, le projet ${p.libelle} (${p.reference}) m'intéresse. Pouvez-vous me mettre en relation ?`)}
					variante="whatsapp"
					target="_blank"
					rel="noopener"
					pleineLargeur
				>
					<MessageCircle class="size-5" aria-hidden="true" />Être mis·e en relation
				</Bouton>
			</section>
		{/if}
		<AlerteWhatsApp compact />
		<PanneauModeration
			etat={p.etat}
			peutModerer={p.peut_moderer}
			peutModifier={p.peut_modifier}
			lienModifier="/marches/projets/{p.id}/modifier"
			{form}
		/>
	</aside>
</div>
