<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Building2 from '@lucide/svelte/icons/building-2';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EncartPublicites from '$lib/components/publicites/EncartPublicites.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteEntreprise from '$lib/components/entreprises/CarteEntreprise.svelte';
	import FiltresEntreprises from '$lib/components/entreprises/FiltresEntreprises.svelte';
	import OngletsSection from '$lib/components/entreprises/OngletsSection.svelte';

	let { data } = $props();
	const f = $derived(data.filtres);
	const ville = $derived(data.villes.find((v) => String(v.id) === f.ville_id)?.nom);
	const secteur = $derived(data.secteurs.find((s) => String(s.id) === f.secteur_id)?.libelle);
	const lieu = $derived(ville ? `à ${ville}` : 'à Brazzaville et Pointe-Noire');
	const titre = $derived(secteur ? `Entreprises : ${secteur} ${lieu}` : `Annuaire des entreprises ${lieu}`);
	const filtre = $derived(!!(f.q || f.secteur_id || f.domaine_id || f.ville_id));
</script>

<svelte:head>
	<title>{titre} — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Trouvez un fournisseur, un prestataire ou un partenaire au Congo {lieu} : annuaire gratuit des entreprises par secteur, domaine d'activité et ville, avec leurs coordonnées."
	/>
</svelte:head>

<EnTetePage
	{titre}
	sousTitre="Trouvez un fournisseur, un prestataire ou un partenaire près de chez vous. Inscription gratuite."
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/entreprises', label: 'Annuaire' }]}
>
	<Bouton href="/entreprises/nouvelle"><Plus class="size-5" aria-hidden="true" />Inscrire mon entreprise</Bouton>
	{#snippet bas()}<OngletsSection projets={data.projets} />{/snippet}
</EnTetePage>

<div class="conteneur py-8">
	{#if data.supprime}<Alerte type="succes" titre="La fiche a été supprimée." class="mb-6" />{/if}

	<FiltresEntreprises secteurs={data.secteurs} villes={data.villes} filtres={f} />

	<div class="mt-8">
		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">
				{data.liste.total} entreprise{data.liste.total > 1 ? 's' : ''}{filtre ? ' correspondant à votre recherche' : ''}
			</p>
			<ul class="grid gap-4 md:grid-cols-2">
				{#each data.liste.items as e (e.id)}
					<li><CarteEntreprise entreprise={e} /></li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={Building2}
				titre={filtre ? 'Aucune entreprise ne correspond à votre recherche' : "L'annuaire attend sa première entreprise"}
				texte="Dites-nous ce que vous cherchez : votre frangine connaît du monde et vous met en relation."
				messageWhatsApp="Bonjour la Frangine, je cherche une entreprise (fournisseur ou prestataire) : pouvez-vous m'aider ?"
			>
				<Bouton href="/entreprises/nouvelle" variante="secondaire">Inscrire mon entreprise</Bouton>
			</EtatVide>
		{/if}
	</div>

	<!-- Colonne « LES PUBLICITES » du legacy (F-S6-33), masquée pour les gestionnaires -->
	{#if data.publicites.length}
		<div class="mt-10"><EncartPublicites publicites={data.publicites} variante="bande" /></div>
	{/if}

	<section class="carte mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex gap-4">
			<span class="grid size-12 shrink-0 place-items-center rounded-xl bg-foret-50 text-foret-700"><BadgeCheck class="size-6" aria-hidden="true" /></span>
			<div>
				<h2 class="text-lg font-bold">Votre entreprise mérite d'être trouvée</h2>
				<p class="text-[15px] text-ardoise">
					Fiche gratuite avec logo et coordonnées, accès au comparateur de prix entre entreprises et aux marchés.
				</p>
			</div>
		</div>
		<Bouton href="/entreprises/nouvelle" variante="fleuve" class="shrink-0">Créer ma fiche</Bouton>
	</section>
</div>
