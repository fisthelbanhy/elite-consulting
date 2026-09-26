<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Handshake from '@lucide/svelte/icons/handshake';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CartePartenariat from '$lib/components/partenariats/CartePartenariat.svelte';

	let { data } = $props();
	const f = $derived(data.filtres);
	const l = $derived(data.liste);
	const peutPublier = $derived(!data.membre?.est_gestionnaire);
</script>

<svelte:head>
	<title>Partenariat & troc : j'ai… je cherche… — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Terrain, local, matériel, savoir-faire : proposez ce que vous avez, trouvez le partenaire qui vous manque. Partenariats et trocs entre entrepreneurs au Congo."
	/>
</svelte:head>

<EnTetePage
	titre="Partenariat & troc"
	surtitre="Opportunités"
	sousTitre="Vous avez un actif, il vous manque un partenaire ? Proposez un échange, trouvez la pièce qui manque à votre projet."
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/partenariats', label: 'Partenariat & troc' }]}
>
	{#if peutPublier}
		<Bouton href="/partenariats/nouveau"><Plus class="size-5" aria-hidden="true" />Proposer un partenariat</Bouton>
	{/if}
	{#snippet bas()}
		{#if data.membre}
			<div class="mt-6">
				<Onglets
					onglets={[
						{ href: '/partenariats', label: 'Toutes les propositions', compteur: data.compteur.publies, actif: !f.miennes },
						{ href: '/partenariats?miennes=1', label: 'Mes propositions', actif: !!f.miennes }
					]}
				/>
			</div>
		{/if}
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	{#if data.supprime}<Alerte type="succes" titre="La fiche a été supprimée." />{/if}

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end" data-sveltekit-keepfocus>
		{#if f.miennes}<input type="hidden" name="miennes" value="1" />{/if}
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher dans les actifs, recherches et objectifs</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Terrain, local, tracteur, financement…" class="pl-10" />
			</div>
		</div>
		<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
	</form>

	{#if l.items.length}
		<p class="text-ardoise" aria-live="polite">{l.total} proposition{l.total > 1 ? 's' : ''}</p>
		<ul class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each l.items as p (p.id)}
				<li><CartePartenariat fiche={p} /></li>
			{/each}
		</ul>
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide
			icone={Handshake}
			titre={f.q ? 'Aucune proposition ne correspond à votre recherche' : 'Pas encore de proposition ici'}
			texte="Dites-nous ce que vous cherchez : votre frangine vous prévient dès qu'une proposition correspond."
			messageWhatsApp="Bonjour la Frangine, je cherche un partenaire pour mon projet : prévenez-moi si une proposition correspond."
		>
			{#if peutPublier}<Bouton href="/partenariats/nouveau">Proposer un partenariat</Bouton>{/if}
		</EtatVide>
	{/if}
</div>
