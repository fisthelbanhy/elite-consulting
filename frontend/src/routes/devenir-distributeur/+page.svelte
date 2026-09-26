<script lang="ts">
	import Coins from '@lucide/svelte/icons/coins';
	import Users from '@lucide/svelte/icons/users';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Chapitres from '$lib/components/distributeur/Chapitres.svelte';
	import AppelAdhesion from '$lib/components/distributeur/AppelAdhesion.svelte';
	import { ETAPES, PLAFOND_CREDIT, SEUIL_MINIMUM, VIDEO_PRESENTATION } from '$lib/components/distributeur/contenus';
	import { fcfa } from '$lib/format';

	let { data } = $props();
	const atouts = [
		{ icone: Coins, titre: 'Achetez au prix distributeur', texte: 'Et revendez au détail avec un différentiel pouvant atteindre 43 %.' },
		{ icone: Users, titre: 'Construisez votre équipe', texte: 'Des bonus mensuels sur les ventes de votre réseau.' },
		{ icone: GraduationCap, titre: 'Formé·e et accompagné·e', texte: 'POA, Journées de succès, formations et votre parrain.' }
	];
</script>

<svelte:head>
	<title>Devenir distributeur Forever Living à Brazzaville — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Gagnez un revenu complémentaire en devenant distributeur des produits Forever Living à l'aloe vera : présentation de l'opportunité, formations et adhésion accompagnée par La Frangine."
	/>
</svelte:head>

<header class="pagne bg-fleuve-800 text-white">
	<div class="bg-fleuve-800/92">
		<div class="conteneur py-10 sm:py-14">
			<nav aria-label="Fil d'Ariane" class="mb-3 text-sm text-fleuve-100">
				<a href="/" class="hover:text-white">Accueil</a> › <a href="/boutique" class="hover:text-white">Bien-être</a> › Devenir distributeur
			</nav>
			<p class="text-sm font-semibold tracking-wide text-soleil-300 uppercase">Opportunité d'affaire</p>
			<h1 class="mt-1 max-w-3xl text-[clamp(1.9rem,6vw,3rem)] leading-tight font-bold text-white">
				Gagnez un revenu en revendant les produits à l'aloe vera
			</h1>
			<p class="mt-3 max-w-2xl text-lg text-fleuve-100">
				Devenez distributeur Forever Living avec votre frangine : une présentation claire, un plan d'action en dix étapes
				et un kit de démarrage à partir de <span class="montant font-semibold text-white">{fcfa(SEUIL_MINIMUM)}</span>.
			</p>
			<div class="mt-6"><AppelAdhesion statut={data.statut} clair /></div>
		</div>
	</div>
</header>
<div class="border-b border-fleuve-900/5 bg-white">
	<div class="conteneur pt-3">
		<Onglets
			label="Opportunité d'affaire"
			onglets={[
				{ href: '/devenir-distributeur', label: 'Présentation', actif: true },
				{ href: '/boutique', label: 'Produits' },
				{ href: '/devenir-distributeur/adhesion', label: 'Adhésion' }
			]}
		/>
	</div>
</div>

<div class="conteneur space-y-12 py-10">
	<ul class="grid gap-4 md:grid-cols-3">
		{#each atouts as a (a.titre)}
			<li class="carte flex gap-4 p-5">
				<a.icone class="size-8 shrink-0 text-laterite-600" aria-hidden="true" />
				<div>
					<h2 class="text-lg font-bold">{a.titre}</h2>
					<p class="mt-1 text-[15px] text-ardoise">{a.texte}</p>
				</div>
			</li>
		{/each}
	</ul>

	{#if VIDEO_PRESENTATION}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video controls preload="none" class="aspect-video w-full rounded-carte bg-encre" src={VIDEO_PRESENTATION}></video>
	{/if}

	<Chapitres />

	<section class="grid gap-6 lg:grid-cols-2" aria-labelledby="titre-etapes">
		<div class="carte p-6 sm:p-8">
			<h2 id="titre-etapes" class="flex items-center gap-2 text-2xl font-bold"><ListChecks class="size-6 text-foret-600" aria-hidden="true" />Votre adhésion en 10 étapes</h2>
			<ol class="mt-4 grid gap-2 text-[15px]">
				{#each ETAPES as e (e.numero)}
					<li class="flex gap-3"><span class="grid size-7 shrink-0 place-items-center rounded-full bg-fleuve-50 text-sm font-bold text-fleuve-700">{e.numero}</span><span class="pt-0.5">{e.titre}</span></li>
				{/each}
			</ol>
		</div>
		<div class="carte space-y-4 p-6 sm:p-8">
			<h2 class="text-2xl font-bold">Deux façons de souscrire</h2>
			<div class="rounded-xl bg-creme p-4">
				<p class="font-bold">Fonds propres</p>
				<p class="text-[15px]">Vous composez votre kit (au moins <span class="montant">{fcfa(SEUIL_MINIMUM)}</span>) et vous le réglez en Mobile Money, en espèces ou par Charden Farell.</p>
			</div>
			<div class="rounded-xl bg-creme p-4">
				<p class="font-bold">Crédit</p>
				<p class="text-[15px]">Pour un kit de <span class="montant">{fcfa(SEUIL_MINIMUM)}</span> à <span class="montant">{fcfa(PLAFOND_CREDIT)}</span> : votre frangine étudie votre demande et vous recontacte.</p>
			</div>
			<p class="text-[15px] text-ardoise">Une seule souscription par membre ; vous pouvez l'enregistrer et la reprendre à tout moment.</p>
			<AppelAdhesion statut={data.statut} />
		</div>
	</section>
</div>
