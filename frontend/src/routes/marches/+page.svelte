<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Landmark from '@lucide/svelte/icons/landmark';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteMarche from '$lib/components/marches/CarteMarche.svelte';
	import CarteProjet from '$lib/components/marches/CarteProjet.svelte';
	import FiltresMarches from '$lib/components/marches/FiltresMarches.svelte';
	import AlerteWhatsApp from '$lib/components/marches/AlerteWhatsApp.svelte';

	let { data } = $props();
	const f = $derived(data.filtres);
	const projets = $derived(data.onglet === 'projets');
	const filtre = $derived(!!(f.q || f.type || f.ouverts || f.montant_min));
	const titre = $derived(
		projets
			? 'Projets en recherche de partenaires'
			: f.type === '2'
				? 'Marchés publics au Congo'
				: f.type === '1'
					? 'Marchés privés au Congo'
					: "Marchés publics et appels d'offres au Congo"
	);
	const c = $derived(data.compteurs);
</script>

<svelte:head>
	<title>{titre} (Brazzaville, Pointe-Noire) — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content={projets
			? 'Projets de développement et programmes qui recherchent partenaires, prestataires ou bénéficiaires au Congo : objet, promoteur, durée, conditions.'
			: "Appels d'offres publics et privés au Congo (Brazzaville, Pointe-Noire) : montant, date limite, dossier à fournir et lieu de dépôt, lisibles sur mobile."}
	/>
</svelte:head>

<EnTetePage
	{titre}
	sousTitre={projets
		? 'Des programmes et projets qui cherchent des partenaires, des prestataires ou des bénéficiaires.'
		: 'Les avis publiés par les membres et relus par nos équipes, avec leur date limite bien en vue.'}
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/marches', label: 'Marchés et projets' }]}
>
	{#if projets}
		<Bouton href="/marches/projets/nouveau"><Plus class="size-5" aria-hidden="true" />Publier un projet</Bouton>
	{:else}
		<Bouton href="/marches/nouveau"><Plus class="size-5" aria-hidden="true" />Publier un appel d'offres</Bouton>
	{/if}
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				label="Marchés et projets"
				onglets={[
					{ href: '/marches', label: "Marchés et appels d'offres", compteur: c?.marches_ouverts ?? null, actif: !projets },
					{ href: '/marches?onglet=projets', label: 'Projets', compteur: c?.projets ?? null, actif: projets }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if data.supprime}<Alerte type="succes" titre="La fiche a été supprimée." />{/if}

	{#if data.marches}
		<FiltresMarches filtres={f} />
		{#if data.marches.items.length}
			<div>
				<p class="mb-4 text-ardoise" aria-live="polite">
					{data.marches.total} marché{data.marches.total > 1 ? 's' : ''}{#if c && !f.ouverts} · {c.marches_ouverts} encore ouvert{c.marches_ouverts > 1 ? 's' : ''}{/if}
				</p>
				<ul class="grid gap-4 md:grid-cols-2">
					{#each data.marches.items as m (m.id)}<li><CarteMarche marche={m} /></li>{/each}
				</ul>
				<Pagination total={data.marches.total} page={data.marches.page} taille={data.marches.taille} />
			</div>
			<AlerteWhatsApp />
		{:else}
			<EtatVide
				icone={Landmark}
				titre={filtre ? 'Aucun marché ne correspond à votre recherche' : "Pas d'appel d'offres ouvert pour l'instant"}
				texte="Laissez-nous votre secteur et votre ville : on vous envoie les nouveaux marchés dès leur publication."
				messageWhatsApp="Bonjour la Frangine, je souhaite recevoir les nouveaux marchés et appels d'offres sur WhatsApp. Mon secteur : … Ma ville : …"
			>
				<Bouton href="/marches/nouveau" variante="secondaire">Publier un appel d'offres</Bouton>
			</EtatVide>
		{/if}
	{:else if data.projets}
		<form method="GET" class="carte flex flex-col gap-3 p-4 sm:flex-row sm:items-end" data-sveltekit-keepfocus>
			<input type="hidden" name="onglet" value="projets" />
			<div class="flex-1">
				<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher un projet</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q" name="q" type="search" value={f.q} placeholder="Agriculture, formation, bailleur…" class="pl-10" maxlength="100" />
				</div>
			</div>
			<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
		</form>
		{#if data.projets.items.length}
			<div>
				<p class="mb-4 text-ardoise" aria-live="polite">{data.projets.total} projet{data.projets.total > 1 ? 's' : ''}</p>
				<ul class="grid gap-4 md:grid-cols-2">
					{#each data.projets.items as p (p.id)}<li><CarteProjet projet={p} /></li>{/each}
				</ul>
				<Pagination total={data.projets.total} page={data.projets.page} taille={data.projets.taille} />
			</div>
		{:else}
			<EtatVide
				icone={FolderKanban}
				titre={f.q ? 'Aucun projet ne correspond à votre recherche' : 'Pas encore de projet publié'}
				texte="Vous portez un programme ou cherchez des partenaires ? Publiez-le, ou demandez conseil à votre frangine."
				messageWhatsApp="Bonjour la Frangine, je cherche des projets ou des partenaires dans mon domaine."
			>
				<Bouton href="/marches/projets/nouveau" variante="secondaire">Publier un projet</Bouton>
			</EtatVide>
		{/if}
		<AlerteWhatsApp />
	{/if}
</div>
