<script lang="ts">
	import Package from '@lucide/svelte/icons/package';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import CarteArticle from '$lib/components/annonces/CarteArticle.svelte';
	import EncartFiches from '$lib/components/annonces/EncartFiches.svelte';
	import { fcfa } from '$lib/format';
	import type { ArticleResume } from '$lib/types/annonces';

	let { data } = $props();
	const f = $derived(data.filtres);
	const titre = $derived(f.miennes ? 'Mes petites annonces' : f.type === '1' ? 'Articles à vendre' : f.type === '2' ? 'Articles recherchés' : 'Petites annonces');
	const avances = $derived(['famille_id', 'neuf_ou_occasion', 'prix_min', 'prix_max', 'tri'].filter((k) => f[k]).length);
	const versEncart = (a: ArticleResume) => ({
		href: `/annonces/${a.id}`,
		titre: a.libelle,
		texte: a.description || a.famille?.libelle || '',
		photo_url: a.photo_url,
		meta: a.prix ? fcfa(a.prix) : undefined
	});
</script>

<svelte:head>
	<title>{titre} neufs et d'occasion à Brazzaville — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Achetez et vendez des articles neufs ou d'occasion entre membres au Congo, avec paiement Mobile Money ou espèces sécurisé par La Frangine. Publiez gratuitement votre annonce."
	/>
</svelte:head>

<EnTetePage
	{titre}
	sousTitre="Neuf ou d'occasion, entre membres. Vous payez via la frangine : le vendeur est réglé une fois la vente vérifiée."
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/annonces', label: 'Petites annonces' }]}
>
	{#if data.membre && !data.gestion}
		<Bouton href="/annonces/panier" variante="secondaire">
			<ShoppingCart class="size-5" aria-hidden="true" />Mon panier{#if data.quantitePanier}&nbsp;<span class="rounded-full bg-laterite-600 px-2 text-sm text-white">{data.quantitePanier}</span>{/if}
		</Bouton>
	{:else if data.gestion}
		<Bouton href="/annonces/panier" variante="secondaire"><ShoppingCart class="size-5" aria-hidden="true" />Paniers en cours</Bouton>
	{/if}
	<Bouton href="/annonces/publier?type={f.type === '2' ? '2' : '1'}"><Plus class="size-5" aria-hidden="true" />Publier une annonce</Bouton>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/annonces', label: 'Tout', compteur: data.compteurs.total, actif: !f.type && !f.miennes },
					{ href: '/annonces?type=1', label: 'À vendre', compteur: data.compteurs.offres, actif: f.type === '1' && !f.miennes },
					{ href: '/annonces?type=2', label: 'Recherchés', compteur: data.compteurs.recherches, actif: f.type === '2' && !f.miennes },
					...(data.membre ? [{ href: '/annonces?miennes=1', label: 'Mes annonces', actif: !!f.miennes }] : [])
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur py-8 {data.encarts ? 'grid gap-8 lg:grid-cols-[1fr_18rem]' : ''}">
	<div class="min-w-0">
		{#if data.supprime}<Alerte type="succes" titre="L'annonce a été supprimée." class="mb-6" />{/if}

		<form method="GET" class="carte mb-6 space-y-3 p-4" data-sveltekit-keepfocus data-sveltekit-noscroll>
			{#if f.type}<input type="hidden" name="type" value={f.type} />{/if}
			{#if f.miennes}<input type="hidden" name="miennes" value={f.miennes} />{/if}
			<div class="flex gap-2">
				<div class="relative flex-1">
					<label for="q-annonces" class="sr-only">Rechercher un article</label>
					<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q-annonces" name="q" type="search" value={f.q} placeholder="Téléphone, pagne, frigo…" class="pl-10" />
				</div>
				<Bouton type="submit" variante="fleuve">Chercher</Bouton>
			</div>
			<details open={avances > 0}>
				<summary class="flex min-h-12 cursor-pointer list-none items-center gap-2 font-semibold text-fleuve-700">
					<SlidersHorizontal class="size-5" aria-hidden="true" />Plus de critères{#if avances}&nbsp;({avances}){/if}
				</summary>
				<div class="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<label for="f-famille" class="mb-1.5 block text-[15px] font-semibold">Famille</label>
						<select id="f-famille" name="famille_id">
							<option value="">Toutes les familles</option>
							{#each data.familles as x (x.id)}<option value={x.id} selected={String(x.id) === f.famille_id}>{x.libelle}</option>{/each}
						</select>
					</div>
					<div>
						<label for="f-etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
						<select id="f-etat" name="neuf_ou_occasion">
							<option value="">Neuf ou occasion</option>
							<option value="1" selected={f.neuf_ou_occasion === '1'}>Neuf</option>
							<option value="2" selected={f.neuf_ou_occasion === '2'}>Occasion</option>
						</select>
					</div>
					<div>
						<label for="f-tri" class="mb-1.5 block text-[15px] font-semibold">Trier par</label>
						<select id="f-tri" name="tri">
							<option value="">Famille puis prix</option>
							<option value="recent" selected={f.tri === 'recent'}>Les plus récents</option>
							<option value="prix" selected={f.tri === 'prix'}>Prix croissant</option>
							<option value="prix_desc" selected={f.tri === 'prix_desc'}>Prix décroissant</option>
						</select>
					</div>
					<fieldset class="sm:col-span-2">
						<legend class="mb-1.5 text-[15px] font-semibold">Prix (FCFA)</legend>
						<div class="grid grid-cols-2 gap-2">
							<label><span class="sr-only">Prix minimum</span><input name="prix_min" type="number" inputmode="numeric" min="0" placeholder="Min." value={f.prix_min} /></label>
							<label><span class="sr-only">Prix maximum</span><input name="prix_max" type="number" inputmode="numeric" min="0" placeholder="Max." value={f.prix_max} /></label>
						</div>
					</fieldset>
					<div class="flex items-end gap-2">
						<Bouton type="submit" variante="fleuve">Appliquer</Bouton>
						{#if avances || f.q}<Bouton href="/annonces{f.type ? `?type=${f.type}` : ''}" variante="fantome">Effacer</Bouton>{/if}
					</div>
				</div>
			</details>
		</form>

		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} article{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="grid grid-cols-2 gap-3 sm:gap-5 {data.encarts ? 'md:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'}">
				{#each data.liste.items as a (a.id)}
					<li><CarteArticle article={a} gestion={data.gestion} /></li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={Package}
				titre={f.q || avances ? 'Aucun article ne correspond à votre recherche' : f.miennes ? "Vous n'avez pas encore publié d'annonce" : 'Pas encore d’article ici'}
				texte="Publiez ce que vous cherchez : les vendeurs vous répondent. Ou demandez à la frangine de vous prévenir."
				messageWhatsApp="Bonjour la Frangine, je cherche un article : prévenez-moi dès qu'il est proposé."
			>
				<Bouton href="/annonces/publier?type={f.type === '1' ? '1' : '2'}">{f.type === '1' ? 'Vendre un article' : 'Publier ma recherche'}</Bouton>
			</EtatVide>
		{/if}
	</div>

	{#if data.encarts}
		<aside class="space-y-6" aria-label="À découvrir">
			<div class="flex gap-3 rounded-xl bg-foret-50 p-4 text-[15px] text-foret-700">
				<ShieldCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
				<p><strong>Paiement vérifié.</strong> Vous réglez via la frangine (Mobile Money, espèces, Charden Farell) : chaque paiement est contrôlé par notre caisse.</p>
			</div>
			<EncartFiches titre="Nouveautés" elements={data.encarts.nouveautes.map(versEncart)} />
			<EncartFiches titre="Les plus visités" ton="laterite" elements={data.encarts.plus_visites.map(versEncart)} />
		</aside>
	{/if}
</div>
