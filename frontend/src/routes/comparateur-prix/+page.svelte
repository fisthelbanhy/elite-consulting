<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Scale from '@lucide/svelte/icons/scale';
	import Settings from '@lucide/svelte/icons/settings';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import OngletsSection from '$lib/components/entreprises/OngletsSection.svelte';
	import AccesReserve from '$lib/components/comparateur/AccesReserve.svelte';
	import FiltresComparateur from '$lib/components/comparateur/FiltresComparateur.svelte';
	import TableauComparatif from '$lib/components/comparateur/TableauComparatif.svelte';
	import { champ } from '$lib/forms';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const a = $derived(data.acces);
	const entrepriseFiltree = $derived(f.entreprise_id ? data.lignes?.items[0]?.entreprise : undefined);
	const produit = $derived(data.produits.find((p) => String(p.id) === f.produit_id));
	const legende = $derived(
		`${f.type === '1' ? 'Offres' : f.type === '2' ? 'Demandes' : 'Offres et demandes'}${produit ? ` — ${produit.nom}` : ''}, triées par prix`
	);
	const sansFiltreEntreprise = $derived.by(() => {
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(f)) if (v && k !== 'entreprise_id' && k !== 'page') p.set(k, v);
		const s = p.toString();
		return `/comparateur-prix${s ? `?${s}` : ''}`;
	});
</script>

<svelte:head>
	<title>Comparateur de prix entre entreprises au Congo — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Comparez les prix pratiqués entre entreprises à Brazzaville et Pointe-Noire : offres et demandes par produit, unité, prix et volume mensuel. Réservé aux comptes entreprise."
	/>
</svelte:head>

<EnTetePage
	titre="Comparateur de prix entre entreprises"
	sousTitre="Qui vend quoi, à quel prix, et qui achète : trouvez vos fournisseurs et vos clients."
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/comparateur-prix', label: 'Comparateur de prix' }]}
>
	{#if a.acces && a.entreprises.length}
		<Bouton href="/comparateur-prix/ma-fiche">Gérer ma fiche de prix</Bouton>
	{/if}
	{#if a.gestionnaire}
		<Bouton href="/comparateur-prix/produits" variante="secondaire"><Settings class="size-5" aria-hidden="true" />Catalogue des produits</Bouton>
	{/if}
	{#snippet bas()}<OngletsSection projets={data.projets} />{/snippet}
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	{#if !a.acces || !data.lignes}
		<AccesReserve acces={a} />
	{:else}
		<FiltresComparateur produits={data.produits} filtres={f} />

		{#if f.entreprise_id}
			<p class="flex flex-wrap items-center gap-2 text-[15px]">
				Prix publiés par <strong>{entrepriseFiltree?.nom ?? 'cette entreprise'}</strong>
				<a href={sansFiltreEntreprise} class="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold text-fleuve-700 hover:bg-fleuve-50">
					<X class="size-4" aria-hidden="true" />Voir toutes les entreprises
				</a>
			</p>
		{/if}

		{#if data.lignes.items.length}
			<p class="text-ardoise" aria-live="polite">{data.lignes.total} ligne{data.lignes.total > 1 ? 's' : ''} · du moins cher au plus cher, sauf autre tri</p>
			<TableauComparatif lignes={data.lignes.items} {legende} />
			<Pagination total={data.lignes.total} page={data.lignes.page} taille={data.lignes.taille} />
		{:else}
			<EtatVide
				icone={Scale}
				titre="Aucun prix publié pour cette recherche"
				texte="Soyez la première entreprise à publier ce produit : vos futurs clients et fournisseurs vous trouveront ici."
				messageWhatsApp="Bonjour la Frangine, je cherche un fournisseur ou un client pour un produit : pouvez-vous m'aider ?"
			>
				{#if a.entreprises.length}<Bouton href="/comparateur-prix/ma-fiche" variante="secondaire">Publier mes prix</Bouton>{/if}
			</EtatVide>
		{/if}

		{#if a.gestionnaire && f.entreprise_id}
			<!-- F-S6-22 : e-mail « Proposition des produits » du gestionnaire à l'entreprise -->
			<section class="carte p-6">
				<h2 class="text-xl font-bold">Écrire à cette entreprise</h2>
				<p class="mt-1 text-[15px] text-ardoise">E-mail « Proposition des produits » envoyé à l'adresse de l'entreprise (réservé aux gestionnaires).</p>
				<Formulaire action="?/email" {form} cle="email" reinitialiser class="mt-4 space-y-4">
					{#snippet children({ envoi })}
						<input type="hidden" name="entreprise_id" value={f.entreprise_id} />
						<Zone label="Message" lignes={5} requis minlength={10} {...champ(form, 'message', '', 'email')} />
						<Bouton type="submit" variante="fleuve" chargement={envoi}>Envoyer</Bouton>
					{/snippet}
				</Formulaire>
			</section>
		{/if}
	{/if}
</div>
