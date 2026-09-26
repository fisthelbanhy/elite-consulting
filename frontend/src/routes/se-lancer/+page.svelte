<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Compass from '@lucide/svelte/icons/compass';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FileText from '@lucide/svelte/icons/file-text';
	import Handshake from '@lucide/svelte/icons/handshake';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import CarteReussite from '$lib/components/reussites/CarteReussite.svelte';
	import { PILIERS, liensVisibles } from '$lib/navigation';
	import { lienWhatsApp, relatif } from '$lib/format';

	let { data } = $props();
	const pilier = PILIERS[0];
	const liens = $derived(liensVisibles(pilier.liens, data.parametres));
	const icones: Record<string, typeof Compass> = {
		'/diagnostic': Compass,
		'/decouverte-de-soi': ClipboardList,
		'/business-plan': FileText,
		'/accompagnement': Handshake,
		'/questions': MessagesSquare,
		'/reussites': Sparkles
	};
	const wa = $derived(
		data.parametres.whatsapp ? lienWhatsApp(data.parametres.whatsapp, 'Bonjour la Frangine, je veux me lancer et je ne sais pas par où commencer.') : ''
	);
	const parcours = [
		{ titre: 'Faire le point', texte: 'Le diagnostic gratuit, puis la Découverte de soi pour mieux vous connaître.' },
		{ titre: 'Formaliser votre idée', texte: 'Un business plan clair, chiffré, que vous pouvez présenter.' },
		{ titre: 'Être accompagné·e', texte: 'Un dossier bancable et une conseillère à vos côtés jusqu’au premier client.' }
	];
</script>

<svelte:head>
	<title>Se lancer : de l'idée au premier client — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Vous voulez créer votre activité au Congo ? Diagnostic gratuit, bilan Découverte de soi, business plan, accompagnement, questions entre entrepreneurs et témoignages : La Frangine vous accompagne pas à pas."
	/>
</svelte:head>

<!-- En-tête du pilier -->
<section class="relative overflow-hidden bg-white">
	<div class="pagne pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-50 lg:block" aria-hidden="true"></div>
	<div class="conteneur relative py-10 sm:py-14">
		<nav aria-label="Fil d'Ariane" class="mb-3 text-sm text-ardoise"><a href="/" class="hover:text-fleuve-700">Accueil</a> › Se lancer</nav>
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">{pilier.titre}</p>
		<h1 class="mt-2 max-w-3xl text-[clamp(2rem,7vw,3.25rem)] leading-[1.08] font-extrabold">{pilier.accroche}, avec une grande sœur à vos côtés.</h1>
		<p class="mt-4 max-w-2xl text-lg text-ardoise">
			Vous avez une idée, un savoir-faire, ou juste l'envie de vous lancer ? On commence par faire le point ensemble, puis on avance
			étape par étape.
		</p>
		<div class="mt-7 flex flex-col gap-3 sm:flex-row">
			<Bouton href="/diagnostic" taille="lg">Faire mon diagnostic gratuit <ArrowRight class="size-5" aria-hidden="true" /></Bouton>
			{#if wa}<Bouton href={wa} variante="whatsapp" taille="lg" target="_blank" rel="noopener"><MessageCircle class="size-5" aria-hidden="true" />Écrire à une conseillère</Bouton>{/if}
		</div>
		<ul class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-ardoise">
			<li class="flex items-center gap-1.5"><CircleCheck class="size-4 text-foret-600" aria-hidden="true" />3 minutes</li>
			<li class="flex items-center gap-1.5"><CircleCheck class="size-4 text-foret-600" aria-hidden="true" />Sans créer de compte</li>
			<li class="flex items-center gap-1.5"><CircleCheck class="size-4 text-foret-600" aria-hidden="true" />3 prochaines étapes concrètes</li>
		</ul>
	</div>
</section>

<!-- Parcours -->
<section class="conteneur py-12" aria-labelledby="titre-parcours">
	<h2 id="titre-parcours" class="text-[clamp(1.5rem,5vw,2.25rem)] font-bold">Votre parcours en trois temps</h2>
	<ol class="mt-6 grid gap-4 md:grid-cols-3">
		{#each parcours as e, i (e.titre)}
			<li class="rounded-2xl bg-white p-6 ring-1 ring-fleuve-900/5">
				<span class="grid size-11 place-items-center rounded-full bg-fleuve-700 font-display text-lg font-extrabold text-white" aria-hidden="true">{i + 1}</span>
				<h3 class="mt-4 text-xl font-bold">{e.titre}</h3>
				<p class="mt-1 text-ardoise">{e.texte}</p>
			</li>
		{/each}
	</ol>
</section>

<!-- Outils du pilier -->
<section class="conteneur pb-12" aria-labelledby="titre-outils">
	<h2 id="titre-outils" class="text-[clamp(1.5rem,5vw,2.25rem)] font-bold">Tout pour démarrer</h2>
	<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each liens as l (l.href)}
			{@const Icone = icones[l.href] ?? Compass}
			<li>
				<a href={l.href} class="carte group flex h-full gap-4 p-5 transition-shadow hover:shadow-levee">
					<span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-laterite-50 text-laterite-700"><Icone class="size-6" aria-hidden="true" /></span>
					<span>
						<span class="block font-display text-lg font-bold text-fleuve-800 group-hover:underline">{l.label}</span>
						<span class="mt-0.5 block text-[15px] text-ardoise">{l.description}</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<!-- Forum -->
<section class="bg-sable" aria-labelledby="titre-forum">
	<div class="conteneur grid gap-8 py-12 lg:grid-cols-[1fr_1.3fr]">
		<div>
			<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Questions & conseils</p>
			<h2 id="titre-forum" class="mt-2 text-[clamp(1.5rem,5vw,2.25rem)] font-bold">Il n'y a pas de question bête</h2>
			<p class="mt-3 text-lg text-ardoise">Papiers, banque, prix, clients : posez votre question aux membres, ou en privé à la frangine.</p>
			<Bouton href="/questions/nouveau" variante="fleuve" class="mt-6">Poser une question</Bouton>
		</div>
		{#if data.sujets.length}
			<ul class="carte divide-y divide-fleuve-900/5">
				{#each data.sujets as s (s.id)}
					<li>
						<a href="/questions/{s.id}" class="block px-5 py-4 hover:bg-creme">
							<span class="block font-semibold text-fleuve-800">{s.objet}</span>
							<span class="mt-0.5 block text-sm text-ardoise">
								{s.auteur?.pseudonyme ?? 'Membre'} · {relatif(s.date_creation)} · {s.nombre_reponses} réponse{s.nombre_reponses > 1 ? 's' : ''}
							</span>
						</a>
					</li>
				{/each}
				<li><a href="/questions" class="lien block px-5 py-4">Voir tous les sujets</a></li>
			</ul>
		{:else}
			<div class="carte flex flex-col justify-center p-6">
				<p class="font-display text-lg font-bold text-fleuve-800">Le forum vous attend.</p>
				<p class="mt-1 text-ardoise">Soyez le premier à poser une question : les réponses aideront aussi ceux qui viennent après vous.</p>
			</div>
		{/if}
	</div>
</section>

<!-- Réussites -->
<section class="conteneur py-12" aria-labelledby="titre-reussites">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Réussites</p>
			<h2 id="titre-reussites" class="mt-2 text-[clamp(1.5rem,5vw,2.25rem)] font-bold">Ils se sont lancés avant vous</h2>
		</div>
		{#if data.reussites.length}<a href="/reussites" class="lien">Toutes les réussites</a>{/if}
	</div>
	{#if data.reussites.length}
		<ul class="mt-6 grid gap-4 md:grid-cols-3">
			{#each data.reussites as r (r.id)}
				<li><CarteReussite reussite={r} /></li>
			{/each}
		</ul>
	{:else}
		<div class="mt-6 rounded-2xl bg-white p-6 ring-1 ring-fleuve-900/5">
			<p class="text-lg">Les premières histoires de membres arrivent bientôt.</p>
			<p class="mt-1 text-ardoise">Vous avez lancé votre activité ? <a href="/reussites/ma-fiche" class="lien">Racontez votre parcours</a> : il donnera du courage à d'autres.</p>
		</div>
	{/if}
</section>
