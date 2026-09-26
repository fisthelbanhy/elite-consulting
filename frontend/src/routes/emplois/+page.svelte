<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import UserRound from '@lucide/svelte/icons/user-round';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteAnnonce from '$lib/components/emplois/CarteAnnonce.svelte';
	import EncartPublicites from '$lib/components/publicites/EncartPublicites.svelte';

	let { data } = $props();
	const f = $derived(data.filtres);
	const domaines = $derived(data.secteurs.find((s) => String(s.id) === f.secteur_id)?.domaines ?? []);
	const titre = $derived(f.type === '1' ? "Demandes d'emploi" : f.type === '2' ? "Offres d'emploi" : 'Emplois');
</script>

<svelte:head>
	<title>{titre} à Brazzaville et Pointe-Noire — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Offres d'emploi et profils de candidats au Congo : publiez gratuitement votre offre ou votre demande d'emploi et soyez mis en relation par La Frangine."
	/>
</svelte:head>

<EnTetePage
	titre={titre}
	sousTitre="Des offres et des profils publiés par les membres, relus par nos équipes."
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/emplois', label: 'Emplois' }]}
>
	<Bouton href="/emplois/publier?type=2" variante="secondaire"><Plus class="size-5" aria-hidden="true" />Publier une offre</Bouton>
	<Bouton href="/emplois/publier?type=1"><Plus class="size-5" aria-hidden="true" />Publier mon profil</Bouton>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/emplois', label: 'Tout', actif: !f.type },
					{ href: '/emplois?type=2', label: "Offres d'emploi", compteur: data.compteurs.offres },
					{ href: '/emplois?type=1', label: "Demandes d'emploi", compteur: data.compteurs.demandes }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur py-8">
	{#if data.supprime}<Alerte type="succes" titre="La fiche a été supprimée." class="mb-6" />{/if}

	<form method="GET" class="carte mb-8 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end" data-sveltekit-keepfocus>
		{#if f.type}<input type="hidden" name="type" value={f.type} />{/if}
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Poste, compétence, diplôme…" class="pl-10" />
			</div>
		</div>
		<div>
			<label for="secteur_id" class="mb-1.5 block text-[15px] font-semibold">Secteur</label>
			<select id="secteur_id" name="secteur_id" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="">Tous les secteurs</option>
				{#each data.secteurs as s (s.id)}<option value={s.id} selected={String(s.id) === f.secteur_id}>{s.libelle}</option>{/each}
			</select>
		</div>
		{#if domaines.length}
			<div>
				<label for="domaine_id" class="mb-1.5 block text-[15px] font-semibold">Domaine</label>
				<select id="domaine_id" name="domaine_id">
					<option value="">Tous</option>
					{#each domaines as d (d.id)}<option value={d.id} selected={String(d.id) === f.domaine_id}>{d.libelle}</option>{/each}
				</select>
			</div>
		{/if}
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	<div class="mb-6 flex items-start gap-3 rounded-xl bg-soleil-100 p-4 text-[15px]">
		<TriangleAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
		<p><strong>Aucun recruteur ne peut vous demander d'argent pour un emploi.</strong> Si cela arrive, c'est une arnaque : <a href="/contact" class="lien">signalez-le-nous</a>.</p>
	</div>

	{#if data.liste.items.length}
		<div class="grid gap-8 {data.publicites.length ? 'lg:grid-cols-[1fr_18rem]' : ''}">
			<div>
				<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} fiche{data.liste.total > 1 ? 's' : ''}</p>
				<ul class="grid gap-4 md:grid-cols-2 {data.publicites.length ? 'lg:grid-cols-1 xl:grid-cols-2' : ''}">
					{#each data.liste.items as a (a.id)}
						<li><CarteAnnonce annonce={a} /></li>
					{/each}
				</ul>
				<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
			</div>
			{#if data.publicites.length}<aside><EncartPublicites publicites={data.publicites} /></aside>{/if}
		</div>
	{:else}
		<EtatVide
			icone={f.type === '1' ? UserRound : Briefcase}
			titre={f.q || f.secteur_id ? 'Aucune fiche ne correspond à votre recherche' : 'Pas encore de fiche ici'}
			texte="Laissez-nous votre numéro : on vous prévient dès qu'une offre correspond à votre profil."
			messageWhatsApp="Bonjour la Frangine, prévenez-moi quand une offre d'emploi correspond à mon profil."
		>
			<Bouton href="/emplois/publier?type={f.type || '1'}">Publier une fiche</Bouton>
		</EtatVide>
	{/if}
</div>
