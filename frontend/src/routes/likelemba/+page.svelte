<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteGroupe from '$lib/components/likelemba/CarteGroupe.svelte';
	import CommentCaMarche from '$lib/components/likelemba/CommentCaMarche.svelte';
	import { lienWhatsApp } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const peutCreer = $derived(!!data.membre?.est_gestionnaire && !!data.membre?.droit_activation);
	const wa = $derived(
		lienWhatsApp(data.parametres.whatsapp, 'Bonjour la Frangine, je voudrais organiser notre Likelemba sur la plateforme.')
	);
</script>

<svelte:head>
	<title>Likelemba : votre tontine organisée, sans cahier — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Organisez votre Likelemba (tontine) avec La Frangine : membres, cautions et témoins, calendrier des tours, cotisations par Mobile Money et reçus numérotés."
	/>
</svelte:head>

<EnTetePage
	titre="Likelemba"
	sousTitre="Votre tontine organisée, sans cahier : membres, calendrier des tours, cotisations et reçus numérotés."
	surtitre="Financer & épargner"
	fil={[{ href: '/financer', label: 'Financer & épargner' }, { href: '/likelemba', label: 'Likelemba' }]}
>
	{#if peutCreer}
		<Bouton href="/likelemba/nouveau"><Plus class="size-5" aria-hidden="true" />Créer un likelemba</Bouton>
	{:else if data.parametres.whatsapp}
		<Bouton href={wa} variante="whatsapp" target="_blank" rel="noopener"><MessageCircle class="size-5" aria-hidden="true" />Organiser ma Likelemba</Bouton>
	{/if}
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/likelemba', label: 'Tous les groupes', compteur: data.compteurs.groupes, actif: !f.miens },
					...(data.membre ? [{ href: '/likelemba?miens=1', label: 'Mes likelembas', actif: !!f.miens }] : [])
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-10 py-8">
	{#if data.supprime}<Alerte type="succes" titre="Le likelemba a été supprimé." />{/if}

	<section aria-labelledby="titre-groupes">
		<h2 id="titre-groupes" class="sr-only">Groupes</h2>
		<form method="GET" class="carte mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" data-sveltekit-keepfocus>
			{#if f.miens}<input type="hidden" name="miens" value="1" />{/if}
			<div>
				<label for="montant_min" class="mb-1.5 block text-[15px] font-semibold">Cotisation minimum (FCFA)</label>
				<input id="montant_min" name="montant_min" type="number" inputmode="numeric" min="0" value={f.montant_min} />
			</div>
			<div>
				<label for="montant_max" class="mb-1.5 block text-[15px] font-semibold">Cotisation maximum (FCFA)</label>
				<input id="montant_max" name="montant_max" type="number" inputmode="numeric" min="0" value={f.montant_max} />
			</div>
			<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
		</form>

		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} groupe{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.liste.items as g (g.id)}
					<li><CarteGroupe groupe={g} enums={data.enums} /></li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={Users}
				titre={f.montant_min || f.montant_max ? 'Aucun groupe dans cette fourchette' : f.miens ? "Vous ne faites partie d'aucun likelemba" : 'Aucun likelemba ouvert pour le moment'}
				texte="Vous avez déjà une tontine entre collègues, voisins ou commerçantes ? La frangine l'installe pour vous sur la plateforme."
				messageWhatsApp="Bonjour la Frangine, je voudrais organiser notre Likelemba sur la plateforme."
			/>
		{/if}
	</section>

	<CommentCaMarche />
</div>
