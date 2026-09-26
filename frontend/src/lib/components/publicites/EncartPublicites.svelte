<script lang="ts">
	/**
	 * Encart publicitaire réutilisable (widget legacy `incl-publicite.php`, F-TRV-04, F-TRV-43).
	 * Données : `chargerEncart(event)` de `$lib/server/publicites` (au plus 10 publicités actives,
	 * ordre aléatoire). Sans publicité, invite à devenir annonceur (état vide = opportunité).
	 *
	 *   <EncartPublicites publicites={data.publicites} />                 // colonne latérale
	 *   <EncartPublicites publicites={data.publicites} variante="bande" /> // bande horizontale
	 */
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import CartePublicite from './CartePublicite.svelte';
	import type { PubliciteDiffusee } from '$lib/types/publicites';

	let {
		publicites,
		titre = 'Ils font confiance à La Frangine',
		variante = 'colonne',
		limite = 10,
		invitation = true
	}: {
		publicites: PubliciteDiffusee[];
		titre?: string;
		variante?: 'colonne' | 'bande';
		limite?: number;
		invitation?: boolean;
	} = $props();

	const affichees = $derived(publicites.slice(0, limite));
</script>

{#if affichees.length || invitation}
	<aside aria-label="Publicités" class="space-y-3">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="font-display text-lg font-bold text-fleuve-700">{titre}</h2>
			<span class="text-xs font-semibold tracking-wide text-ardoise uppercase">Publicité</span>
		</div>
		{#if affichees.length}
			<ul class={variante === 'bande' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4' : 'space-y-3'}>
				{#each affichees as pub (pub.id)}
					<li><CartePublicite {pub} compacte={variante === 'colonne'} /></li>
				{/each}
			</ul>
			<p class="text-sm">
				<a href="/publicites" class="lien">Toutes les annonces</a>
				· <a href="/publicites#devenir-annonceur" class="lien">Devenir annonceur</a>
			</p>
		{:else}
			<a href="/publicites#devenir-annonceur" class="pagne flex items-center gap-3 rounded-carte bg-white p-4 ring-1 ring-fleuve-900/5 hover:shadow-levee">
				<span class="grid size-11 shrink-0 place-items-center rounded-full bg-soleil-100 text-laterite-700"><Megaphone class="size-5" aria-hidden="true" /></span>
				<span>
					<span class="block font-semibold text-fleuve-800">Votre entreprise ici ?</span>
					<span class="block text-sm text-ardoise">Faites-vous connaître des entrepreneurs de Brazzaville et Pointe-Noire.</span>
				</span>
			</a>
		{/if}
	</aside>
{/if}
