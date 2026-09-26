<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Store from '@lucide/svelte/icons/store';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import GrilleProduits from '$lib/components/boutique/GrilleProduits.svelte';
	import Rayons from '$lib/components/boutique/Rayons.svelte';
	import BandeauDistributeur from '$lib/components/boutique/BandeauDistributeur.svelte';
	import { fcfa } from '$lib/format';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const c = $derived(data.catalogue);
	const groupe = $derived(data.groupes.find((g) => String(g.groupe) === f.groupe));
	const titre = $derived(groupe ? groupe.libelle : 'Boutique bien-être');
	const filtre = $derived(!!(f.q || f.groupe));
	const panier = $derived(data.compteurs?.panier ?? 0);
</script>

<svelte:head>
	<title>{titre} — produits Forever Living à l'aloe vera — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Commandez les produits Forever Living à l'aloe vera (boissons, soins, compléments) auprès de La Frangine à Brazzaville et Pointe-Noire. Prix distributeur pour les membres distributeurs."
	/>
</svelte:head>

<EnTetePage
	{titre}
	surtitre="Bien-être"
	sousTitre="Les produits Forever Living à l'aloe vera, commandés en toute confiance auprès de votre frangine."
	fil={[{ href: '/boutique', label: 'Boutique' }, ...(groupe ? [{ href: `/boutique?groupe=${groupe.groupe}`, label: groupe.libelle }] : [])]}
>
	<Bouton href="/panier" variante="secondaire">
		<ShoppingCart class="size-5" aria-hidden="true" />Mon panier{#if panier}&nbsp;({panier}){/if}
	</Bouton>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				label="Bien-être"
				onglets={[
					{ href: '/boutique', label: 'Produits', actif: true },
					{ href: '/devenir-distributeur', label: 'Devenir distributeur' },
					...(data.parametres.module_sante_actif ? [{ href: '/bien-etre', label: 'Fiches bien-être' }] : [])
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if c.distributeur}
		<p class="flex items-center gap-2 rounded-xl bg-foret-50 p-4 font-semibold text-foret-700">
			<BadgeCheck class="size-5 shrink-0" aria-hidden="true" />Vous êtes distributeur : le prix distributeur s'applique à tous vos achats.
		</p>
	{/if}

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end" data-sveltekit-keepfocus>
		{#if f.groupe}<input type="hidden" name="groupe" value={f.groupe} />{/if}
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher un produit</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Nom, référence, ingrédient…" class="pl-10" />
			</div>
		</div>
		<div>
			<label for="tri" class="mb-1.5 block text-[15px] font-semibold">Trier par</label>
			<select id="tri" name="tri" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="" selected={f.tri === ''}>Disponibles d'abord</option>
				<option value="prix" selected={f.tri === 'prix'}>Prix croissant</option>
				<option value="prix_desc" selected={f.tri === 'prix_desc'}>Prix décroissant</option>
				<option value="populaires" selected={f.tri === 'populaires'}>Les plus consultés</option>
				<option value="nom" selected={f.tri === 'nom'}>Nom (A → Z)</option>
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
	</form>

	{#if filtre}
		<Rayons groupes={data.groupes} actif={f.groupe} compact />
	{:else}
		<Rayons groupes={data.groupes} />
	{/if}

	{#if !c.distributeur}<BandeauDistributeur />{/if}

	<div class="grid gap-8 lg:grid-cols-[1fr_17rem]">
		<section aria-labelledby="titre-produits">
			<h2 id="titre-produits" class="mb-4 text-xl font-bold">
				{f.q ? `Résultats pour « ${f.q} »` : groupe ? groupe.libelle : 'Tous les produits'}
				<span class="text-base font-normal text-ardoise" aria-live="polite">({c.total})</span>
			</h2>
			{#if c.items.length}
				<GrilleProduits produits={c.items.map((p) => ({ produit: p }))} distributeur={c.distributeur} {form} colonnes="grid-cols-2 md:grid-cols-3" />
				<Pagination total={c.total} page={c.page} taille={c.taille} />
			{:else}
				<EtatVide
					icone={Store}
					titre="Aucun produit ne correspond à votre recherche"
					texte="Dites-nous ce que vous cherchez : votre frangine vérifie la disponibilité auprès de Forever Living."
					messageWhatsApp="Bonjour la Frangine, je cherche un produit Forever Living que je ne trouve pas sur la boutique."
				>
					<Bouton href="/boutique" variante="secondaire">Voir tous les produits</Bouton>
				</EtatVide>
			{/if}
		</section>

		{#if data.populaires.length}
			<aside aria-labelledby="titre-populaires" class="lg:sticky lg:top-24 lg:self-start">
				<div class="carte p-5">
					<h2 id="titre-populaires" class="flex items-center gap-2 text-lg font-bold">
						<TrendingUp class="size-5 text-laterite-600" aria-hidden="true" />Les plus demandés
					</h2>
					<ol class="mt-3 divide-y divide-fleuve-900/5">
						{#each data.populaires as p, i (p.id)}
							<li>
								<a href="/boutique/{p.id}" class="flex min-h-12 items-center gap-3 py-2 hover:text-fleuve-700">
									<span class="w-5 text-sm font-bold text-ardoise">{i + 1}</span>
									<span class="flex-1 text-[15px] leading-snug font-semibold">{p.nom}</span>
									{#if p.prix > 0}<span class="montant text-sm text-laterite-700">{fcfa(p.prix)}</span>{/if}
								</a>
							</li>
						{/each}
					</ol>
				</div>
			</aside>
		{/if}
	</div>
</div>
