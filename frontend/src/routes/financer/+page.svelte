<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Receipt from '@lucide/svelte/icons/receipt';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import CarteProjet from '$lib/components/projets/CarteProjet.svelte';
	import CarteGroupe from '$lib/components/likelemba/CarteGroupe.svelte';
	import CommentCaMarche from '$lib/components/likelemba/CommentCaMarche.svelte';
	import { PILIERS, liensVisibles } from '$lib/navigation';
	import { fcfa, lienWhatsApp } from '$lib/format';

	let { data } = $props();
	const pilier = PILIERS[1];
	const liens = $derived(liensVisibles(pilier.liens, data.parametres));
	const wa = $derived(lienWhatsApp(data.parametres.whatsapp, 'Bonjour la Frangine, je voudrais un conseil pour financer mon activité.'));
	const garanties = [
		{ icone: Receipt, titre: 'Une référence pour chaque opération', texte: 'Cotisations, apports, dons, pointages : chaque mouvement porte un numéro unique.' },
		{ icone: BellRing, titre: 'Vous êtes prévenu·e', texte: 'Un message à chaque promesse, versement, cotisation ou pointage qui vous concerne.' },
		{ icone: ShieldCheck, titre: 'Une caisse qui vérifie', texte: 'Les paiements déclarés sont confirmés par notre caisse avant d’être comptés.' }
	];
</script>

<svelte:head>
	<title>Financer & épargner : Likelemba, appels de fonds, épargne — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Organisez votre Likelemba, faites financer votre projet par les membres, épargnez au quotidien et comparez les banques : La Frangine vous accompagne à Brazzaville et Pointe-Noire."
	/>
</svelte:head>

<header class="pagne border-b border-fleuve-900/5 bg-white">
	<div class="conteneur py-10 sm:py-14">
		<p class="mb-1 text-sm font-semibold tracking-wide text-laterite-600 uppercase">{pilier.titre}</p>
		<h1 class="max-w-3xl text-[clamp(2rem,7vw,3rem)] leading-tight font-bold">{pilier.accroche}</h1>
		<p class="mt-3 max-w-2xl text-lg text-ardoise">
			Tontine, financement de projet, épargne entre membres, conseil bancaire : tout ce qu'il faut pour faire grandir votre activité,
			avec des reçus et des références à chaque étape.
		</p>
		<div class="mt-6 flex flex-wrap gap-3">
			<Bouton href="/likelemba" taille="lg">Organiser ma Likelemba</Bouton>
			{#if data.parametres.whatsapp}
				<Bouton href={wa} variante="whatsapp" taille="lg" target="_blank" rel="noopener"><MessageCircle class="size-5" aria-hidden="true" />Parler à une conseillère</Bouton>
			{/if}
		</div>
	</div>
</header>

<div class="conteneur space-y-14 py-10">
	<section aria-labelledby="titre-services">
		<h2 id="titre-services" class="text-2xl font-bold">Nos services</h2>
		<ul class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each liens as l (l.href)}
				<li>
					<a href={l.href} class="carte group flex h-full items-start justify-between gap-3 p-5 transition-shadow hover:shadow-levee">
						<span>
							<span class="block font-display text-lg font-bold text-fleuve-800">{l.label}</span>
							<span class="mt-1 block text-[15px] text-ardoise">{l.description}</span>
						</span>
						<ArrowRight class="mt-1 size-5 shrink-0 text-laterite-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="titre-zoom-likelemba" class="space-y-6">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-sm font-semibold tracking-wide text-foret-700 uppercase">Zoom sur</p>
				<h2 id="titre-zoom-likelemba" class="text-2xl font-bold">La Likelemba, sans cahier ni dispute</h2>
			</div>
			<Bouton href="/likelemba" variante="secondaire">Voir les groupes<ArrowRight class="size-4" aria-hidden="true" /></Bouton>
		</div>
		<CommentCaMarche titre="Le principe, en 4 temps" />
		{#if data.groupes.items.length}
			<ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.groupes.items as g (g.id)}<li><CarteGroupe groupe={g} enums={data.enums} /></li>{/each}
			</ul>
		{/if}
	</section>

	<section aria-labelledby="titre-projets" class="space-y-6">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 id="titre-projets" class="text-2xl font-bold">Projets à soutenir</h2>
				{#if data.compteurs.projets}
					<p class="mt-1 text-ardoise">{data.compteurs.projets} projet{data.compteurs.projets > 1 ? 's' : ''} · {fcfa(data.compteurs.montant_promis)} promis par les membres</p>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<Bouton href="/projets/nouveau" variante="secondaire">Présenter mon projet</Bouton>
				<Bouton href="/projets" variante="fantome">Tous les projets<ArrowRight class="size-4" aria-hidden="true" /></Bouton>
			</div>
		</div>
		{#if data.projets.items.length}
			<ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.projets.items as p (p.id)}<li><CarteProjet projet={p} /></li>{/each}
			</ul>
		{:else}
			<p class="carte p-6 text-ardoise">Aucun projet en recherche de financement pour le moment. Soyez le premier : la frangine relit et fait connaître votre projet.</p>
		{/if}
		<p class="text-sm text-ardoise">Les promesses d'apport sont des engagements entre membres ; La Frangine ne garantit ni le projet ni le remboursement.</p>
	</section>

	<section aria-labelledby="titre-confiance" class="rounded-carte bg-fleuve-800 p-6 text-white sm:p-10">
		<h2 id="titre-confiance" class="text-2xl font-bold text-white">Votre argent, en toute confiance</h2>
		<ul class="mt-6 grid gap-6 sm:grid-cols-3">
			{#each garanties as g (g.titre)}
				<li>
					<g.icone class="size-7 text-soleil-300" aria-hidden="true" />
					<h3 class="mt-2 text-lg font-bold text-white">{g.titre}</h3>
					<p class="mt-1 text-[15px] text-fleuve-100">{g.texte}</p>
				</li>
			{/each}
		</ul>
		<p class="mt-6 text-sm text-fleuve-100">La Frangine ne détient pas vos fonds et ne vous demandera jamais votre code PIN.</p>
	</section>
</div>
