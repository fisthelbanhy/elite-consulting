<script lang="ts">
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Sprout from '@lucide/svelte/icons/sprout';
	import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
	import Building from '@lucide/svelte/icons/building';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import CarteQuestionnaire from '$lib/components/accompagnement/CarteQuestionnaire.svelte';
	import { jsonLd, lienWhatsApp } from '$lib/format';

	let { data } = $props();
	const icones = { 'business-plan': Briefcase, 'projet-agricole': Sprout, 'restructuration-credit': RefreshCcw, 'credit-immobilier': Building };
	const etapes = [
		{ titre: 'Vous répondez à votre rythme', texte: 'Un questionnaire clair, découpé en parties. Sauvegardez, revenez quand vous voulez.' },
		{ titre: 'Votre conseiller complète avec vous', texte: 'Il relit, pose les bonnes questions et vous aide à chiffrer ce qui manque.' },
		{ titre: 'Un dossier prêt pour la banque', texte: 'Structuré comme les banques l’attendent, pour défendre votre projet.' }
	];
	const wa = $derived(data.parametres.whatsapp);
	const donnees = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'Accompagnement La Frangine',
			itemListElement: data.questionnaires.map((q, i) => ({ '@type': 'ListItem', position: i + 1, name: q.libelle, description: q.description }))
		})
	);
</script>

<svelte:head>
	<title>Accompagnement : business plan bancable, projet agricole, crédit — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Business plan bancable, projet agricole, restructuration de crédit, crédit immobilier : La Frangine prépare votre dossier de financement avec vous, au format attendu par les banques du Congo."
	/>
	{@html donnees}
</svelte:head>

<EnTetePage
	titre="On prépare votre dossier avec vous"
	sousTitre="Un dossier bancable, c’est la moitié du financement. Choisissez votre accompagnement : un conseiller vous guide jusqu’à la banque."
	surtitre="Accompagnement"
	fil={[{ href: '/se-lancer', label: 'Se lancer' }, { href: '/accompagnement', label: 'Accompagnement' }]}
/>

<div class="conteneur space-y-12 py-8">
	<ul class="grid gap-5 md:grid-cols-2">
		{#each data.questionnaires as q (q.slug)}
			<li>
				<CarteQuestionnaire
					questionnaire={q}
					icone={icones[q.slug as keyof typeof icones] ?? Briefcase}
					mesDossiers={data.compteurs?.par_type[String(q.type)] ?? null}
				/>
			</li>
		{/each}
	</ul>

	<section aria-labelledby="comment" class="pagne rounded-carte bg-sable/60 p-6 sm:p-10">
		<h2 id="comment" class="text-2xl font-bold">Comment ça marche</h2>
		<ol class="mt-6 grid gap-6 md:grid-cols-3">
			{#each etapes as e, i (e.titre)}
				<li class="carte p-5">
					<span class="grid size-10 place-items-center rounded-full bg-laterite-600 font-display text-lg font-bold text-white">{i + 1}</span>
					<h3 class="mt-3 text-lg font-bold">{e.titre}</h3>
					<p class="mt-1 text-[15px] text-ardoise">{e.texte}</p>
				</li>
			{/each}
		</ol>
		<p class="mt-6 flex items-start gap-2 text-[15px]">
			<Lock class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />
			Vos réponses sont confidentielles : seuls vous et votre conseiller les voyez.
		</p>
	</section>

	<section class="carte flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Vous ne savez pas par où commencer ?</h2>
			<p class="text-ardoise">Décrivez votre projet en deux lignes : un conseiller vous oriente vers le bon accompagnement.</p>
		</div>
		<div class="flex flex-wrap gap-3">
			{#if wa}
				<Bouton href={lienWhatsApp(wa, 'Bonjour la Frangine, je voudrais être accompagné·e pour mon dossier de financement.')} variante="whatsapp" target="_blank" rel="noopener">
					<MessageCircle class="size-5" aria-hidden="true" />WhatsApp
				</Bouton>
			{/if}
			<Bouton href="/conseil-financier/nouveau?rubrique=1" variante="secondaire">Poser ma question</Bouton>
		</div>
	</section>
</div>
