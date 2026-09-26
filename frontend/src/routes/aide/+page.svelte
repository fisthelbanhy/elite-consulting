<script lang="ts">
	import Rocket from '@lucide/svelte/icons/rocket';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Compass from '@lucide/svelte/icons/compass';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { PILIERS, liensVisibles } from '$lib/navigation';
	import { jsonLd, lienWhatsApp } from '$lib/format';
	import { texteAideHtml } from './texte-aide';
	import { FAQ } from './faq';

	let { data } = $props();
	const p = $derived(data.parametres);
	// Texte d'aide paramétré par les gestionnaires, rendu sans risque (F-TRV-33, F-TRV-34)
	const aide = $derived(texteAideHtml(p.texte_aide));
	const icones: Record<string, typeof Rocket> = { 'se-lancer': Rocket, financer: PiggyBank, opportunites: Briefcase, 'bien-etre': Leaf };

	const etapes = [
		{ icone: Compass, titre: 'Explorez librement', texte: "Emplois, annonces, marchés, conseils : tout se consulte sans compte. Commencez par le diagnostic gratuit, en 3 minutes." },
		{ icone: UserPlus, titre: 'Créez votre compte', texte: 'Gratuit, en une minute : votre nom, votre téléphone, votre ville. Le reste se complète plus tard, quand c’est utile.' },
		{ icone: HeartHandshake, titre: 'Avancez accompagné·e', texte: 'Publiez, rejoignez une Likelemba, trouvez des clients… et écrivez à votre frangine dès que vous avez un doute.' }
	];

	const faqLd = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: FAQ.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.reponse } }))
		})
	);
</script>

<svelte:head>
	<title>Comment ça marche ? — {p.nom_site}</title>
	<meta
		name="description"
		content="Comment utiliser La Frangine : se lancer, financer et épargner avec la Likelemba, trouver des opportunités. Guide pas à pas et réponses aux questions fréquentes."
	/>
	{@html faqLd}
</svelte:head>

<EnTetePage
	titre="Comment ça marche ?"
	surtitre="Aide"
	sousTitre="{p.nom_site}, c'est la grande sœur de ceux qui se lancent : un conseil humain, une Likelemba sans prise de tête et les bonnes opportunités au bon moment."
	fil={[{ href: '/aide', label: 'Aide' }]}
/>

<div class="conteneur space-y-14 py-10">
	<section aria-labelledby="titre-etapes">
		<h2 id="titre-etapes" class="text-2xl font-bold">En trois étapes</h2>
		<ol class="mt-5 grid gap-4 md:grid-cols-3">
			{#each etapes as e, i (e.titre)}
				<li class="carte relative p-5">
					<span class="absolute top-4 right-4 font-display text-4xl font-bold text-sable" aria-hidden="true">{i + 1}</span>
					<span class="grid size-12 place-items-center rounded-full bg-fleuve-50 text-fleuve-700"><e.icone class="size-6" aria-hidden="true" /></span>
					<h3 class="mt-3 text-lg font-bold">{e.titre}</h3>
					<p class="mt-1 text-[15px] text-ardoise">{e.texte}</p>
				</li>
			{/each}
		</ol>
		<div class="mt-6 flex flex-wrap gap-3">
			<Bouton href="/diagnostic">Faire mon diagnostic gratuit</Bouton>
			{#if !data.membre}<Bouton href="/inscription" variante="secondaire">Créer mon compte</Bouton>{/if}
		</div>
	</section>

	<section aria-labelledby="titre-piliers">
		<h2 id="titre-piliers" class="text-2xl font-bold">Tout ce que vous trouverez ici</h2>
		<p class="mt-1 text-ardoise">Le site est organisé autour de trois piliers, plus une boutique bien-être.</p>
		<div class="mt-5 grid gap-4 md:grid-cols-2">
			{#each PILIERS as pilier (pilier.id)}
				{@const Icone = icones[pilier.id] ?? Compass}
				<section class="carte p-5" aria-labelledby="pilier-{pilier.id}">
					<div class="flex items-center gap-3">
						<span class="grid size-11 place-items-center rounded-full bg-soleil-100 text-laterite-700"><Icone class="size-5" aria-hidden="true" /></span>
						<div>
							<h3 id="pilier-{pilier.id}" class="text-lg font-bold">{pilier.titre}</h3>
							<p class="text-sm text-ardoise">{pilier.accroche}</p>
						</div>
					</div>
					<ul class="mt-4 divide-y divide-fleuve-900/5">
						{#each liensVisibles(pilier.liens, p) as l (l.href)}
							<li>
								<a href={l.href} class="flex min-h-12 flex-col justify-center py-2 hover:text-fleuve-800">
									<span class="font-semibold text-fleuve-700">{l.label}</span>
									<span class="text-sm text-ardoise">{l.description}</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</section>

	{#if aide}
		<section aria-labelledby="titre-mot" class="carte p-6 sm:p-8">
			<h2 id="titre-mot" class="text-2xl font-bold">Le mot de votre frangine</h2>
			<div class="prose mt-4 max-w-none prose-p:my-3 prose-strong:text-fleuve-800">
				{@html aide}
			</div>
		</section>
	{/if}

	<section aria-labelledby="titre-faq">
		<h2 id="titre-faq" class="text-2xl font-bold">Questions fréquentes</h2>
		<div class="mt-5 space-y-3">
			{#each FAQ as q (q.question)}
				<details class="group carte overflow-hidden">
					<summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-fleuve-800 hover:bg-creme [&::-webkit-details-marker]:hidden">
						{q.question}
						<ChevronDown class="size-5 shrink-0 text-ardoise transition-transform group-open:rotate-180" aria-hidden="true" />
					</summary>
					<div class="space-y-2 border-t border-fleuve-900/5 p-4">
						<p>{q.reponse}</p>
						{#if q.lien}<a href={q.lien.href} class="lien">{q.lien.label}</a>{/if}
					</div>
				</details>
			{/each}
		</div>
	</section>

	<section class="pagne rounded-carte bg-white p-6 text-center ring-1 ring-fleuve-900/5 sm:p-10" aria-labelledby="titre-question">
		<h2 id="titre-question" class="text-2xl font-bold">Vous n'avez pas trouvé votre réponse ?</h2>
		<p class="mx-auto mt-2 max-w-xl text-ardoise">Une vraie personne vous répond, sans jugement : il n'y a pas de question bête.</p>
		<div class="mt-6 flex flex-wrap justify-center gap-3">
			{#if p.whatsapp}
				<Bouton href={lienWhatsApp(p.whatsapp, "Bonjour la Frangine, j'ai une question sur le fonctionnement du site.")} variante="whatsapp" target="_blank" rel="noopener">
					<MessageCircle class="size-5" aria-hidden="true" />Écrire sur WhatsApp
				</Bouton>
			{/if}
			<Bouton href={data.membre && !data.membre.est_gestionnaire ? '/espace/messages' : '/contact'} variante="secondaire">Écrire à votre frangine</Bouton>
		</div>
	</section>
</div>
