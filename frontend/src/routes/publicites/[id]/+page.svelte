<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import MediaPublicite from '$lib/components/publicites/MediaPublicite.svelte';
	import CartePublicite from '$lib/components/publicites/CartePublicite.svelte';
	import DevenirAnnonceur from '$lib/components/publicites/DevenirAnnonceur.svelte';
	import { dateCourte, dateHeure, entier, tronquer } from '$lib/format';
	import { ETATS_PUBLICITE } from '$lib/types/publicites';

	let { data } = $props();
	const pub = $derived(data.pub);
	const titre = $derived(pub.annonceur ?? 'Publicité');
	const externe = $derived(/^https?:\/\//i.test(pub.lien));
</script>

<svelte:head>
	<title>{titre} — Annonceurs — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(pub.texte_affiche, 155)} />
	{#if !pub.en_diffusion}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<EnTetePage {titre} surtitre="Publicité" fil={[{ href: '/publicites', label: 'Annonceurs' }]} />

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<article class="min-w-0 space-y-5">
		{#if pub.demandeur || pub.peut_gerer}
			<Alerte type={pub.en_diffusion ? 'info' : 'attention'} titre={pub.en_diffusion ? 'Aperçu : cette publicité est en diffusion.' : "Aperçu : cette publicité n'est pas visible du public."}>
				<p class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span>{pub.reference}</span>
					<BadgeEtat etat={pub.etat} libelles={ETATS_PUBLICITE} />
					<span>Du {dateCourte(pub.date_debut)} au {dateCourte(pub.date_fin)}</span>
					{#if pub.nombre_vues !== null}
						<span>{entier(pub.nombre_vues)} vue{pub.nombre_vues > 1 ? 's' : ''}{#if pub.date_derniere_vue} · dernière le {dateHeure(pub.date_derniere_vue)}{/if}</span>
					{/if}
				</p>
				{#if pub.peut_gerer}
					<a href="/gestion/publicites/{pub.id}" class="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2">
						<ShieldCheck class="size-4" aria-hidden="true" />Gérer cette publicité
					</a>
				{/if}
			</Alerte>
		{/if}

		<div class="carte space-y-5 p-4 sm:p-6">
			<MediaPublicite {pub} taille="grand" />
			<p class="text-lg break-words whitespace-pre-line">{pub.texte_affiche}</p>
			{#if pub.lien}
				<Bouton href={pub.lien} target={externe ? '_blank' : undefined} rel={externe ? 'sponsored noopener' : undefined}>
					En savoir plus{#if externe}<ExternalLink class="size-5" aria-hidden="true" /><span class="sr-only"> (nouvel onglet)</span>{/if}
				</Bouton>
			{/if}
		</div>
		<p class="text-sm text-ardoise">
			Contenu publicitaire proposé par {pub.annonceur ?? 'un annonceur'}. {data.parametres.nom_site} n'est pas responsable des offres de ses
			annonceurs : restez vigilant·e et ne payez jamais d'avance sans garantie.
		</p>
	</article>

	<aside class="space-y-4" aria-labelledby="titre-autres">
		<h2 id="titre-autres" class="text-lg font-bold">Autres annonceurs</h2>
		{#if data.autres.length}
			<ul class="space-y-3">
				{#each data.autres as autre (autre.id)}
					<li><CartePublicite pub={autre} compacte /></li>
				{/each}
			</ul>
		{:else}
			<p class="text-[15px] text-ardoise">Pas d'autre annonce en ce moment.</p>
		{/if}
	</aside>
</div>

<div class="conteneur pb-8">
	<DevenirAnnonceur whatsapp={data.parametres.whatsapp} nomSite={data.parametres.nom_site} />
</div>
