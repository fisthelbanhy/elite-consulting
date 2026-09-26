<script lang="ts">
	import House from '@lucide/svelte/icons/house';
	import Plus from '@lucide/svelte/icons/plus';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EncartFiches from '$lib/components/annonces/EncartFiches.svelte';
	import CarteBien from '$lib/components/immobilier/CarteBien.svelte';
	import FiltresBiens from '$lib/components/immobilier/FiltresBiens.svelte';
	import { lieuBien, prixBien, titreBien } from '$lib/components/immobilier/libelles';
	import type { BienResume } from '$lib/types/immobilier';

	let { data } = $props();
	const f = $derived(data.filtres);
	const titre = $derived(
		f.miens ? 'Mes annonces immobilières' : f.type === '1' ? 'Biens à louer et à vendre' : f.type === '2' ? 'Recherches de biens' : 'Immobilier'
	);
	const filtre = $derived(['transaction', 'type_bien', 'ville_id', 'quartier_id', 'chambres', 'pieces_min', 'surface_min', 'surface_max', 'prix_min', 'prix_max', 'q'].some((k) => f[k]));
	const versEncart = (b: BienResume) => ({
		href: `/immobilier/${b.id}`,
		titre: titreBien(data.enums, b),
		texte: lieuBien(b) || b.description,
		photo_url: b.photo_url,
		meta: prixBien(b)
	});
</script>

<svelte:head>
	<title>{titre} à Brazzaville et Pointe-Noire — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Maisons, appartements, terrains, bureaux et commerces à louer ou à vendre au Congo. Publiez gratuitement votre annonce immobilière ou votre recherche sur La Frangine."
	/>
</svelte:head>

<EnTetePage
	{titre}
	sousTitre="Location, vente et recherches publiées par les membres. La frangine fait le lien entre vous."
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/immobilier', label: 'Immobilier' }]}
>
	<Bouton href="/immobilier/publier?type={f.type === '2' ? '2' : '1'}"><Plus class="size-5" aria-hidden="true" />Publier une annonce</Bouton>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/immobilier', label: 'Tout', compteur: data.compteurs.total, actif: !f.type && !f.miens },
					{ href: '/immobilier?type=1', label: 'Offres', compteur: data.compteurs.offres, actif: f.type === '1' && !f.miens },
					{ href: '/immobilier?type=2', label: 'Recherches', compteur: data.compteurs.recherches, actif: f.type === '2' && !f.miens },
					...(data.membre ? [{ href: '/immobilier?miens=1', label: 'Mes annonces', actif: !!f.miens }] : [])
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur py-8 {data.encarts ? 'grid gap-8 lg:grid-cols-[1fr_20rem]' : ''}">
	<div class="min-w-0">
		{#if data.supprime}<Alerte type="succes" titre="L'annonce a été supprimée." class="mb-6" />{/if}
		<FiltresBiens filtres={f} villes={data.villes} />

		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">
				{data.liste.total}
				{data.gestion ? 'immobilier' : 'bien'}{data.liste.total > 1 ? 's' : ''}{f.q || filtre ? ' correspondant à votre recherche' : ''}
			</p>
			<ul class="grid gap-5 sm:grid-cols-2 {data.encarts ? '' : 'lg:grid-cols-3'}">
				{#each data.liste.items as b (b.id)}
					<li><CarteBien bien={b} gestion={data.gestion} /></li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={House}
				titre={filtre ? 'Aucun bien ne correspond à votre recherche' : f.miens ? "Vous n'avez pas encore publié d'annonce" : 'Pas encore de bien ici'}
				texte="Publiez votre recherche : les propriétaires vous répondent. Ou laissez votre numéro à la frangine, elle vous prévient dès qu'un bien correspond."
				messageWhatsApp="Bonjour la Frangine, je cherche un logement (quartier, budget) : prévenez-moi dès qu'un bien correspond."
			>
				<Bouton href="/immobilier/publier?type={f.type === '1' ? '1' : '2'}">{f.type === '1' ? 'Proposer mon bien' : 'Publier ma recherche'}</Bouton>
			</EtatVide>
		{/if}
	</div>

	{#if data.encarts}
		<aside class="space-y-6" aria-label="À découvrir">
			<div class="flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px]">
				<ShieldAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
				<p><strong>Visitez toujours avant de payer.</strong> Ne versez ni avance ni caution sans avoir vu le bien et son propriétaire.</p>
			</div>
			<EncartFiches titre="Nouveautés" elements={data.encarts.nouveautes.map(versEncart)} />
			<EncartFiches titre="Les plus visités" ton="laterite" elements={data.encarts.plus_visites.map(versEncart)} />
		</aside>
	{/if}
</div>
