<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import ListeApports from '$lib/components/projets/ListeApports.svelte';
	import AvertissementProjets from '$lib/components/projets/AvertissementProjets.svelte';
	import { fcfa } from '$lib/format';
	import { ETATS_APPORT } from '$lib/types/projets';

	let { data } = $props();
	const gestionnaire = $derived(!!data.membre?.est_gestionnaire);
	const f = $derived(data.filtres);
	const l = $derived(data.liste);
</script>

<svelte:head>
	<title>{gestionnaire ? 'Apports de fonds' : 'Mes apports'} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={gestionnaire ? 'Apports de fonds' : 'Mes apports'}
	sousTitre={gestionnaire
		? 'Toutes les promesses des membres : validez-les, enregistrez les versements reçus, annulez si besoin.'
		: 'Vos promesses de soutien et vos versements. Pour déclarer un versement, ouvrez l’apport concerné.'}
	surtitre="Appels de fonds"
	fil={[{ href: '/projets', label: 'Appels de fonds' }, { href: '/projets/apports', label: gestionnaire ? 'Apports' : 'Mes apports' }]}
>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/projets', label: 'Tous les projets' },
					{ href: '/projets?miens=1', label: 'Mes projets' },
					{ href: '/projets/apports', label: gestionnaire ? 'Tous les apports' : 'Mes apports', compteur: l.total }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	<section aria-label="Totaux" class="grid grid-cols-2 gap-3 text-center">
		<div class="carte p-4"><p class="text-sm text-ardoise">Total promis</p><p class="montant font-display text-xl font-bold text-fleuve-800">{fcfa(l.total_promis)}</p></div>
		<div class="carte p-4"><p class="text-sm text-ardoise">Total versé</p><p class="montant font-display text-xl font-bold text-foret-700">{fcfa(l.total_verse)}</p></div>
	</section>

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end" data-sveltekit-keepfocus>
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Référence ou remarque</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} class="pl-10" />
			</div>
		</div>
		<div>
			<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat" name="etat">
				<option value="">Tous</option>
				{#each [1, 2, 3] as e (e)}<option value={e} selected={String(e) === f.etat}>{ETATS_APPORT[e]}</option>{/each}
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	{#if l.items.length}
		<section class="carte px-4 py-2 sm:px-6">
			<ListeApports apports={l.items} enums={data.enums} />
		</section>
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide
			icone={HandCoins}
			titre={f.q || f.etat ? 'Aucun apport ne correspond à votre recherche' : "Vous n'avez encore soutenu aucun projet"}
			texte="Parcourez les projets des membres : un don, un prêt ou une prise de participation, même modeste, fait avancer un entrepreneur."
		>
			<Bouton href="/projets">Voir les projets</Bouton>
		</EtatVide>
	{/if}

	<AvertissementProjets />
</div>
