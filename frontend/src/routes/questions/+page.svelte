<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteSujet from '$lib/components/questions/CarteSujet.svelte';
	import { tronquer } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const connecte = $derived(!!data.membre);
	const gestionnaire = $derived(!!data.membre?.est_gestionnaire);
	const lienNouveau = $derived(connecte ? '/questions/nouveau' : '/connexion?suite=/questions/nouveau');
</script>

<svelte:head>
	<title>Questions & conseils entre entrepreneurs — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Posez vos questions sur la création d'entreprise, le financement, la banque ou la gestion au Congo : les membres et les conseillères de La Frangine vous répondent, en public ou en privé."
	/>
</svelte:head>

<EnTetePage
	titre="Questions & conseils"
	sousTitre="Les informations utiles partagées entre membres. Une question délicate ? Posez-la en privé : seule la frangine la lira."
	surtitre="Se lancer"
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/questions', label: 'Questions & conseils' }]}
>
	<Bouton href={lienNouveau}><Plus class="size-5" aria-hidden="true" />Poser une question</Bouton>
	{#snippet bas()}
		{#if connecte}
			<div class="mt-6">
				<Onglets
					onglets={[
						{ href: '/questions', label: 'Tous les sujets', compteur: data.compteurs.sujets, actif: !f.miens && !f.etat },
						{ href: '/questions?miens=1', label: 'Mes questions', actif: !!f.miens },
						...(gestionnaire ? [{ href: '/questions?etat=1', label: 'Masqués', actif: f.etat === '1' }] : [])
					]}
				/>
			</div>
		{/if}
	{/snippet}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div>
		{#if data.supprime}<Alerte type="succes" titre="Le sujet a été supprimé." class="mb-6" />{/if}

		<form method="GET" role="search" class="carte mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end" data-sveltekit-keepfocus>
			{#if f.miens}<input type="hidden" name="miens" value="1" />{/if}
			{#if f.etat}<input type="hidden" name="etat" value={f.etat} />{/if}
			<div class="flex-1">
				<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher un sujet</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q" name="q" type="search" value={f.q} placeholder="Banque, impôts, Likelemba…" class="pl-10" />
				</div>
			</div>
			<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
		</form>

		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">
				{data.liste.total} sujet{data.liste.total > 1 ? 's' : ''}{f.q ? ` pour « ${f.q} »` : ''}
			</p>
			<ul class="grid gap-4">
				{#each data.liste.items as s (s.id)}
					<li><CarteSujet sujet={s} /></li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={MessagesSquare}
				titre={f.q ? 'Aucun sujet ne correspond à votre recherche' : f.miens ? "Vous n'avez pas encore posé de question" : 'Soyez le premier à poser une question'}
				texte="Création d'entreprise, banque, prix, clients… Il n'y a pas de question bête : les membres et la frangine vous répondent."
				messageWhatsApp="Bonjour la Frangine, j'ai une question sur mon projet."
			>
				<Bouton href={lienNouveau} variante="fleuve">Poser une question</Bouton>
			</EtatVide>
		{/if}
	</div>

	<aside class="space-y-6" aria-label="Compléments">
		<section class="carte p-5">
			<h2 class="flex items-center gap-2 text-lg font-bold"><Lock class="size-5 text-foret-600" aria-hidden="true" />Une question personnelle ?</h2>
			<p class="mt-2 text-[15px] text-ardoise">
				Choisissez « Privé » : votre question n'est visible que de vous et de la frangine, qui vous répond directement.
			</p>
			<a href={connecte ? '/questions/nouveau?confidentialite=1' : '/connexion?suite=/questions/nouveau%3Fconfidentialite%3D1'} class="lien mt-3 inline-block">
				Poser une question privée
			</a>
		</section>

		{#if data.derniers.length}
			<section class="carte p-5" aria-labelledby="titre-derniers">
				<h2 id="titre-derniers" class="text-lg font-bold">Derniers sujets</h2>
				<ul class="mt-3 divide-y divide-fleuve-900/5">
					{#each data.derniers as s (s.id)}
						<li><a href="/questions/{s.id}" class="block py-2.5 text-[15px] font-medium text-fleuve-700 hover:underline">{tronquer(s.objet, 120)}</a></li>
					{/each}
				</ul>
			</section>
		{/if}
	</aside>
</div>
