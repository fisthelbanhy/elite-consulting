<script lang="ts">
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Scale from '@lucide/svelte/icons/scale';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Landmark from '@lucide/svelte/icons/landmark';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import AccesReserve from '$lib/components/tresorerie/AccesReserve.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { lienWhatsApp } from '$lib/format';
	import { RUBRIQUES_TRESORERIE, type CleRubrique } from '$lib/types/tresorerie';

	let { data } = $props();
	const icones = { placements: PiggyBank, operations: ArrowLeftRight, credits: HandCoins, contentieux: Scale };
	const exemples: Record<CleRubrique, string> = {
		placements: 'Ex. : placer 2 000 000 FCFA sur 12 mois au meilleur taux.',
		operations: 'Ex. : programmer le virement de vos fournisseurs à Pointe-Noire.',
		credits: 'Ex. : financer un four à pain de 5 000 000 FCFA sur 24 mois.',
		contentieux: 'Ex. : renégocier des échéances devenues trop lourdes.'
	};
	const cles = Object.keys(RUBRIQUES_TRESORERIE) as CleRubrique[];
	const wa = $derived(data.parametres.whatsapp);
</script>

<svelte:head>
	<title>Trésorerie et crédit : placements, virements, crédit — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Placez votre épargne, programmez vos virements, demandez un crédit ou restructurez une dette : La Frangine prépare votre dossier et le porte auprès des banques du Congo."
	/>
</svelte:head>

<EnTeteTresorerie
	titre="Trésorerie & crédit"
	sousTitre="Votre argent, vos banques, un seul interlocuteur : on prépare vos demandes et on les suit avec vous."
	compteurs={data.compteurs}
/>

<div class="conteneur space-y-10 py-8">
	<ul class="grid gap-4 md:grid-cols-2">
		{#each cles as c (c)}
			{@const Icone = icones[c]}
			{@const r = RUBRIQUES_TRESORERIE[c]}
			<li>
				<a href="/tresorerie/{c}" class="carte group flex h-full gap-4 p-5 transition-shadow hover:shadow-levee sm:p-6">
					<span class="grid size-12 shrink-0 place-items-center rounded-full bg-fleuve-50 text-fleuve-700"><Icone class="size-6" aria-hidden="true" /></span>
					<span class="min-w-0 flex-1">
						<span class="flex items-center justify-between gap-2">
							<span class="font-display text-xl font-bold text-fleuve-800">{r.titre}</span>
							{#if data.compteurs}<span class="rounded-full bg-sable px-2.5 py-0.5 text-sm text-ardoise">{data.compteurs[c]}</span>{/if}
						</span>
						<span class="mt-1 block text-ardoise">{r.description}</span>
						<span class="mt-2 block text-sm text-ardoise italic">{exemples[c]}</span>
						<span class="mt-3 inline-flex items-center gap-1 font-semibold text-fleuve-700 group-hover:underline">
							{data.membre ? 'Ouvrir' : 'Découvrir'}<ArrowRight class="size-4" aria-hidden="true" />
						</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>

	{#if !data.membre}
		<AccesReserve texte="Placements, virements, crédit et contentieux sont réservés aux membres : créez votre compte gratuit, un conseiller vous accompagne ensuite." />
	{/if}

	<section class="grid gap-6 lg:grid-cols-3" aria-label="Pourquoi passer par la frangine">
		<div class="carte p-6">
			<ShieldCheck class="size-7 text-foret-600" aria-hidden="true" />
			<h2 class="mt-3 text-lg font-bold">Vos fonds restent à la banque</h2>
			<p class="mt-1 text-[15px] text-ardoise">La Frangine ne détient jamais votre argent : nous préparons et transmettons vos demandes, votre banque les exécute.</p>
		</div>
		<div class="carte p-6">
			<Landmark class="size-7 text-fleuve-600" aria-hidden="true" />
			<h2 class="mt-3 text-lg font-bold">Toutes les banques comparées</h2>
			<p class="mt-1 text-[15px] text-ardoise">
				Consultez les <a href="/tarifs-bancaires" class="lien">tarifs bancaires</a> et laissez-nous faire jouer la concurrence.
			</p>
		</div>
		<div class="carte p-6">
			<MessageCircle class="size-7 text-laterite-600" aria-hidden="true" />
			<h2 class="mt-3 text-lg font-bold">Un conseiller vous répond</h2>
			<p class="mt-1 text-[15px] text-ardoise">Dans chaque rubrique, écrivez à la frangine : la réponse arrive dans votre espace.</p>
			{#if wa}
				<div class="mt-4">
					<Bouton href={lienWhatsApp(wa, 'Bonjour la Frangine, j’ai une question sur la trésorerie et le crédit.')} variante="whatsapp" target="_blank" rel="noopener">
						<MessageCircle class="size-5" aria-hidden="true" />Écrire sur WhatsApp
					</Bouton>
				</div>
			{/if}
		</div>
	</section>

	<p class="text-center text-ardoise">
		Vous préparez un dossier complet (business plan, projet agricole, crédit immobilier) ?
		<a href="/accompagnement" class="lien">Découvrez l'accompagnement</a>.
	</p>
</div>
