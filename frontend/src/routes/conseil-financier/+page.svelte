<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import Lock from '@lucide/svelte/icons/lock';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Clock from '@lucide/svelte/icons/clock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteSujet from '$lib/components/conseil-financier/CarteSujet.svelte';
	import AccesReserve from '$lib/components/tresorerie/AccesReserve.svelte';
	import { RUBRIQUES, type Rubrique } from '$lib/types/conseil-financier';

	let { data } = $props();
	const f = $derived(data.filtres);
	const rubrique = $derived(Number(f.rubrique) as Rubrique);
	const r = $derived(RUBRIQUES[rubrique]);
	const gestion = $derived(!!data.membre?.est_gestionnaire);
	// Un membre ne garde qu'un sujet ouvert par rubrique (F-S7-03)
	const ouvert = $derived(
		gestion ? null : rubrique === 1 ? data.compteurs?.sujet_ouvert_conseil : data.compteurs?.sujet_ouvert_rumeurs
	);
	const avantages = [
		{ icone: UserRound, titre: 'Un vrai conseiller', texte: 'Pas un robot : une personne qui connaît les banques de Brazzaville et Pointe-Noire.' },
		{ icone: Lock, titre: 'Confidentiel', texte: 'Votre question reste privée entre vous et votre conseiller, sauf si vous choisissez de la partager.' },
		{ icone: Clock, titre: 'Réponse rapide', texte: 'En général sous 24 h ouvrées, directement dans votre espace.' }
	];
</script>

<svelte:head>
	<title>{r.titre} — posez vos questions d'argent à un conseiller — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Épargne, crédit, choix d'une banque, gestion de trésorerie : posez votre question à un conseiller financier de La Frangine et suivez l'actualité économique du Congo, décryptée."
	/>
</svelte:head>

<EnTetePage
	titre={r.titre}
	sousTitre={r.description}
	surtitre="Financer & épargner"
	fil={[{ href: '/financer', label: 'Financer & épargner' }, { href: '/conseil-financier', label: 'Conseil financier' }]}
>
	{#if data.membre && !ouvert}
		<Bouton href="/conseil-financier/nouveau?rubrique={rubrique}"><Plus class="size-5" aria-hidden="true" />{rubrique === 1 ? 'Poser une question' : 'Publier une actu'}</Bouton>
	{/if}
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/conseil-financier?rubrique=1', label: RUBRIQUES[1].court, compteur: data.compteurs?.conseil, actif: rubrique === 1 },
					{ href: '/conseil-financier?rubrique=2', label: RUBRIQUES[2].court, compteur: data.compteurs?.rumeurs, actif: rubrique === 2 },
					{ href: '/accompagnement', label: 'Accompagnement', actif: false }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if !data.liste}
		<ul class="grid gap-4 md:grid-cols-3">
			{#each avantages as a (a.titre)}
				<li class="carte p-6">
					<a.icone class="size-7 text-fleuve-600" aria-hidden="true" />
					<h2 class="mt-3 text-lg font-bold">{a.titre}</h2>
					<p class="mt-1 text-[15px] text-ardoise">{a.texte}</p>
				</li>
			{/each}
		</ul>
		<AccesReserve texte="Créez votre compte gratuit pour poser votre question : un conseiller vous répond, en privé." />
	{:else}
		{#if data.supprime}<Alerte type="succes" titre="Le sujet a été supprimé." />{/if}
		{#if ouvert}
			<Alerte type="info" titre="Pour entamer un nouveau sujet, il faut clôturer le précédent.">
				<a href="/conseil-financier/{ouvert}" class="underline underline-offset-2">Ouvrir mon sujet en cours</a> : vous pouvez y ajouter des précisions ou le clôturer.
			</Alerte>
		{/if}

		<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end" data-sveltekit-keepfocus>
			<input type="hidden" name="rubrique" value={rubrique} />
			<div>
				<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q" name="q" type="search" value={f.q} placeholder="Épargne, crédit, banque…" class="pl-10" />
				</div>
			</div>
			{#if gestion}
				<div>
					<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
					<select id="etat" name="etat">
						<option value="">Tous (hors supprimés)</option>
						<option value="1" selected={f.etat === '1'}>En attente</option>
						<option value="2" selected={f.etat === '2'}>Ouverts</option>
						<option value="4" selected={f.etat === '4'}>Clôturés</option>
					</select>
				</div>
			{/if}
			<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
		</form>

		{#if data.liste.items.length}
			<p class="text-ardoise" aria-live="polite">{data.liste.total} sujet{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="grid gap-4">
				{#each data.liste.items as s (s.id)}<li><CarteSujet sujet={s} /></li>{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={rubrique === 1 ? MessageCircle : Newspaper}
				titre={f.q ? 'Aucun sujet ne correspond à votre recherche' : rubrique === 1 ? 'Une question d’argent ? Posez-la.' : 'Aucune actu pour l’instant'}
				texte={rubrique === 1
					? 'Épargne, crédit, choix d’une banque, frais bancaires : un conseiller vous répond en privé.'
					: 'Partagez une actualité économique : la communauté et nos conseillers la décryptent.'}
				messageWhatsApp="Bonjour la Frangine, j’ai une question sur mon argent."
			>
				{#if !ouvert}<Bouton href="/conseil-financier/nouveau?rubrique={rubrique}">{rubrique === 1 ? 'Poser ma question' : 'Publier une actu'}</Bouton>{/if}
			</EtatVide>
		{/if}
	{/if}
</div>
