<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteReussite from '$lib/components/reussites/CarteReussite.svelte';

	let { data } = $props();
	const f = $derived(data.filtres);
	const gestionnaire = $derived(!!data.membre?.est_gestionnaire);
	const lienTemoigner = $derived(data.membre ? '/reussites/ma-fiche' : '/connexion?suite=/reussites/ma-fiche');
</script>

<svelte:head>
	<title>Réussites entrepreneuriales au Congo — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Ils se sont lancés à Brazzaville et Pointe-Noire : parcours, difficultés, stratégie et conseils d'entrepreneurs accompagnés par La Frangine."
	/>
</svelte:head>

<EnTetePage
	titre="Ils se sont lancés"
	sousTitre="De vrais parcours de membres : d'où ils partaient, ce qui a marché, et leurs conseils pour vous."
	surtitre="Réussites"
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/reussites', label: 'Réussites' }]}
>
	<Bouton href="/diagnostic">Faire mon diagnostic gratuit</Bouton>
	{#snippet bas()}
		{#if gestionnaire}
			<div class="mt-6">
				<Onglets
					onglets={[
						{ href: '/reussites', label: 'Publiées', compteur: data.compteurs.publiees, actif: !f.etat },
						{ href: '/reussites?etat=1', label: 'À valider', compteur: data.compteurs.a_valider, actif: f.etat === '1' }
					]}
				/>
			</div>
		{/if}
	{/snippet}
</EnTetePage>

<div class="conteneur py-8">
	{#if data.supprime}<Alerte type="succes" titre="Le témoignage a été supprimé." class="mb-6" />{/if}

	<form method="GET" role="search" class="carte mb-8 grid gap-3 p-4 sm:grid-cols-[1fr_16rem_auto] sm:items-end" data-sveltekit-keepfocus>
		{#if f.etat}<input type="hidden" name="etat" value={f.etat} />{/if}
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Projet, pseudonyme…" class="pl-10" />
			</div>
		</div>
		<div>
			<label for="secteur_id" class="mb-1.5 block text-[15px] font-semibold">Secteur</label>
			<select id="secteur_id" name="secteur_id">
				<option value="">Tous les secteurs</option>
				{#each data.secteurs as s (s.id)}<option value={s.id} selected={String(s.id) === f.secteur_id}>{s.libelle}</option>{/each}
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	{#if data.liste.items.length}
		<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} témoignage{data.liste.total > 1 ? 's' : ''}</p>
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.liste.items as r (r.id)}
				<li><CarteReussite reussite={r} titre="h2" /></li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide
			icone={Sparkles}
			titre={f.q || f.secteur_id ? 'Aucun témoignage ne correspond à votre recherche' : f.etat ? 'Aucun témoignage à valider' : 'Les premières histoires arrivent'}
			texte="Vous avez lancé votre activité ? Racontez votre parcours : il donnera du courage à ceux qui hésitent encore."
		>
			<Bouton href={lienTemoigner} variante="fleuve"><PenLine class="size-5" aria-hidden="true" />Raconter mon histoire</Bouton>
		</EtatVide>
	{/if}

	<section class="mt-12 flex flex-col items-start gap-4 rounded-3xl bg-sable p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
		<div>
			<h2 class="text-2xl font-bold">Vous aussi, vous avez réussi ?</h2>
			<p class="mt-1 text-ardoise">Partagez votre parcours sous votre pseudonyme, après relecture par la frangine.</p>
		</div>
		<Bouton href={lienTemoigner} variante="secondaire"><PenLine class="size-5" aria-hidden="true" />Raconter mon histoire</Bouton>
	</section>
</div>
