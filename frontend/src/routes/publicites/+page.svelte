<script lang="ts">
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Eye from '@lucide/svelte/icons/eye';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import CartePublicite from '$lib/components/publicites/CartePublicite.svelte';
	import DevenirAnnonceur from '$lib/components/publicites/DevenirAnnonceur.svelte';
	import { dateCourte, entier, tronquer } from '$lib/format';
	import { ETATS_PUBLICITE } from '$lib/types/publicites';

	let { data } = $props();
</script>

<svelte:head>
	<title>Nos annonceurs — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Les entreprises et commerces qui font confiance à La Frangine, à Brazzaville et Pointe-Noire. Faites connaître votre activité auprès des entrepreneurs."
	/>
</svelte:head>

<EnTetePage
	titre="Nos annonceurs"
	surtitre="Publicités"
	sousTitre="Des entreprises et des commerces d'ici qui soutiennent La Frangine. Cliquez sur une annonce pour la voir en grand."
	fil={[{ href: '/publicites', label: 'Annonceurs' }]}
/>

<div class="conteneur space-y-10 py-8">
	{#if data.publicites.length}
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.publicites as pub (pub.id)}
				<li><CartePublicite {pub} /></li>
			{/each}
		</ul>
	{:else}
		<EtatVide
			icone={Megaphone}
			titre="Aucune annonce en ce moment"
			texte="La place est libre : votre entreprise pourrait être la première à s'afficher ici."
		/>
	{/if}

	<DevenirAnnonceur whatsapp={data.parametres.whatsapp} nomSite={data.parametres.nom_site} />

	{#if data.miennes.length}
		<section aria-labelledby="titre-miennes" class="space-y-4">
			<h2 id="titre-miennes" class="text-2xl font-bold">Mes publicités</h2>
			<ul class="grid gap-3 md:grid-cols-2">
				{#each data.miennes as p (p.id)}
					<li class="carte space-y-2 p-4">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm font-semibold text-ardoise">{p.reference}</span>
							<BadgeEtat etat={p.etat} libelles={ETATS_PUBLICITE} />
							{#if p.en_diffusion}<span class="text-sm font-semibold text-foret-700">En diffusion</span>{/if}
						</div>
						<p class="text-[15px]">{tronquer(p.texte_affiche, 120)}</p>
						<p class="flex flex-wrap items-center gap-x-4 text-sm text-ardoise">
							<span>Du {dateCourte(p.date_debut)} au {dateCourte(p.date_fin)}</span>
							<span class="flex items-center gap-1"><Eye class="size-4" aria-hidden="true" />{entier(p.nombre_vues)} vue{p.nombre_vues > 1 ? 's' : ''}</span>
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
