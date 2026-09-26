<script lang="ts">
	import { page } from '$app/state';
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import OngletsEpargne from '$lib/components/epargne/OngletsEpargne.svelte';
	import AvertissementEpargne from '$lib/components/epargne/AvertissementEpargne.svelte';
	import ModuleDesactive from '$lib/components/epargne/ModuleDesactive.svelte';
	import { dateHeure, fcfa } from '$lib/format';

	let { data } = $props();
	const s = $derived(data.statut);
	const m = $derived(data.membre);
</script>

<svelte:head>
	<title>Épargne solidaire : dons, placements, carte de pointage — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Épargne solidaire entre membres de La Frangine : faites un don, souscrivez un placement pour vous ou un proche, épargnez au quotidien avec la carte de pointage."
	/>
</svelte:head>

<EnTetePage
	titre="Épargne solidaire"
	sousTitre="Donner, placer, mettre de côté chaque jour : entre membres, avec une référence pour chaque opération."
	surtitre="Financer & épargner"
	fil={[{ href: '/financer', label: 'Financer & épargner' }, { href: '/epargne', label: 'Épargne solidaire' }]}
>
	{#snippet bas()}
		{#if s.actif}<OngletsEpargne actif="presentation" />{/if}
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if !s.actif}
		<ModuleDesactive message={s.message} />
	{:else}
		{#if !m}
			<p class="rounded-xl bg-fleuve-50 p-4 text-[15px] text-fleuve-800">
				Veuillez vous connecter pour accéder à vos dons, placements et à votre carte de pointage.
				<a href="/connexion?suite={page.url.pathname}" class="lien">Se connecter</a> ·
				<a href="/inscription?suite={page.url.pathname}" class="lien">Créer un compte gratuit</a>
			</p>
		{/if}

		<div class="grid gap-6 md:grid-cols-2">
			<section class="carte flex flex-col p-6" aria-labelledby="titre-dons">
				<span class="grid size-12 place-items-center rounded-full bg-laterite-50 text-laterite-700" aria-hidden="true"><HandHeart class="size-6" /></span>
				<h2 id="titre-dons" class="mt-4 text-2xl font-bold">Dons & placements</h2>
				<p class="mt-2 text-ardoise">
					Faites un don à partir de {fcfa(s.don_minimum)}, ou souscrivez un placement de {s.duree_min} à {s.duree_max} mois à partir de
					{fcfa(s.placement_minimum)} — pour vous ou au nom d'un proche, qui est prévenu pour le paiement.
				</p>
				<div class="mt-auto flex flex-wrap gap-3 pt-5">
					<Bouton href="/epargne/dons-placements/nouveau">Faire un don ou un placement</Bouton>
					<Bouton href="/epargne/dons-placements" variante="fantome">Mes souscriptions<ArrowRight class="size-4" aria-hidden="true" /></Bouton>
				</div>
			</section>

			<section class="carte flex flex-col p-6" aria-labelledby="titre-pointage">
				<span class="grid size-12 place-items-center rounded-full bg-foret-50 text-foret-700" aria-hidden="true"><CreditCard class="size-6" /></span>
				<h2 id="titre-pointage" class="mt-4 text-2xl font-bold">Carte de pointage</h2>
				<p class="mt-2 text-ardoise">
					Déposez un peu chaque jour auprès d'un agent de caisse agréé. Chaque versement ou retrait exige votre code PIN et vous est
					notifié. Un retrait reste possible jusqu'à 97 % de votre solde.
				</p>
				{#if m}
					<p class="mt-4 rounded-xl bg-creme p-3">
						Votre solde : <strong class="montant text-lg text-foret-700">{fcfa(m.solde_point_caisse)}</strong>
						{#if m.date_dernier_pointage}<span class="block text-sm text-ardoise">Dernière opération : {dateHeure(m.date_dernier_pointage)}</span>{/if}
					</p>
				{/if}
				<div class="mt-auto pt-5">
					<Bouton href="/epargne/carte-pointage" variante="fleuve">Voir mes pointages<ArrowRight class="size-4" aria-hidden="true" /></Bouton>
				</div>
			</section>
		</div>

		<AvertissementEpargne />
	{/if}
</div>
