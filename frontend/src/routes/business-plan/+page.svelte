<script lang="ts">
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import FormulaireBusinessPlan from '$lib/components/business-plan/FormulaireBusinessPlan.svelte';
	import { ETAPES_BP } from '$lib/components/business-plan/questions';
	import { date } from '$lib/format';

	let { data, form } = $props();
	const plan = $derived(data.plan);
	const envoye = $derived(plan?.etat === 2);
</script>

<svelte:head>
	<title>Business plan : formalisez votre projet pas à pas — {data.parametres.nom_site}</title>
	{#if data.membre}
		<meta name="robots" content="noindex" />
	{:else}
		<meta
			name="description"
			content="Formalisez votre idée d'entreprise en 25 questions simples, puis envoyez votre business plan à une conseillère de La Frangine. Gratuit pour les membres."
		/>
	{/if}
</svelte:head>

<EnTetePage
	titre="Mon business plan"
	surtitre="Se lancer"
	sousTitre="25 questions simples, en 6 étapes, pour passer de l'idée au projet. Sauvegardez quand vous voulez, envoyez quand vous êtes prêt·e."
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/business-plan', label: 'Business plan' }]}
/>

<div class="conteneur max-w-4xl space-y-6 py-8">
	{#if !data.membre}
		<section class="carte space-y-5 p-6 sm:p-8">
			<h2 class="text-2xl font-bold">Comment ça marche ?</h2>
			<ol class="grid gap-3 sm:grid-cols-2">
				{#each ETAPES_BP as e, i (e.titre)}
					<li class="flex gap-3 rounded-xl bg-creme p-4">
						<span class="grid size-8 shrink-0 place-items-center rounded-full bg-fleuve-700 font-bold text-white">{i + 1}</span>
						<span><span class="block font-semibold">{e.titre}</span><span class="text-[15px] text-ardoise">{e.aide}</span></span>
					</li>
				{/each}
			</ol>
			<p class="flex items-start gap-2 text-[15px] text-ardoise">
				<Lock class="mt-0.5 size-4 shrink-0" aria-hidden="true" />Votre business plan est confidentiel : il n'est lu que par
				vous et votre conseillère.
			</p>
			<div class="flex flex-wrap gap-3">
				<Bouton href="/inscription?suite=/business-plan" taille="lg">Créer mon compte gratuit</Bouton>
				<Bouton href="/connexion?suite=/business-plan" variante="secondaire" taille="lg">J'ai déjà un compte</Bouton>
			</div>
		</section>
	{:else}
		{#if data.envoye}
			<Alerte type="succes" titre="Votre business plan est envoyé à votre frangine.">Elle le relit et revient vers vous dans la messagerie.</Alerte>
		{:else if data.enregistre}
			<Alerte type="succes" titre="Enregistrement effectué.">Votre brouillon est sauvegardé : reprenez-le quand vous voulez.</Alerte>
		{/if}

		{#if plan}
			<div class="flex flex-wrap items-center gap-3 text-[15px]">
				<Badge ton={envoye ? 'foret' : 'soleil'}>{envoye ? 'Envoyé à votre frangine' : 'Brouillon'}</Badge>
				<span class="text-ardoise">Référence {plan.reference} · créé le {date(plan.date_creation)}</span>
			</div>
		{/if}

		<FormulaireBusinessPlan {form} initial={plan} {envoye} />

		<div class="flex flex-wrap items-center gap-3 rounded-xl bg-fleuve-50 p-4 text-[15px] text-fleuve-800">
			<ClipboardList class="size-5 shrink-0" aria-hidden="true" />
			<p class="flex-1">Besoin d'un dossier complet pour une banque ? Découvrez <a href="/accompagnement" class="lien">l'accompagnement</a>.</p>
			<a href="/contact" class="inline-flex items-center gap-1.5 font-semibold text-foret-700"><MessageCircle class="size-4" aria-hidden="true" />Poser une question</a>
		</div>
	{/if}
</div>
