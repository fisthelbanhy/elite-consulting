<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Users from '@lucide/svelte/icons/users';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Landmark from '@lucide/svelte/icons/landmark';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Handshake from '@lucide/svelte/icons/handshake';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Lock from '@lucide/svelte/icons/lock';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Bell from '@lucide/svelte/icons/bell';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Quote from '@lucide/svelte/icons/quote';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import EncartPublicites from '$lib/components/publicites/EncartPublicites.svelte';
	import { fcfa, entier, jsonLd, lienWhatsApp, lienTel, relatif, telephone, tronquer } from '$lib/format';

	let { data } = $props();
	const p = $derived(data.parametres);
	const s = $derived(data.stats);
	const wa = $derived(lienWhatsApp(p.whatsapp, "Bonjour la Frangine, je voudrais être accompagné·e dans mon projet."));

	const intentions = [
		{
			href: '/diagnostic',
			icone: Rocket,
			titre: 'Lancer mon activité',
			texte: 'Savoir par où commencer, faire mon business plan, être accompagné·e.',
			couleur: 'bg-laterite-50 text-laterite-700'
		},
		{
			href: '/likelemba',
			icone: Users,
			titre: 'Organiser ma Likelemba',
			texte: 'Fini les cahiers et les disputes : membres, cotisations et reçus.',
			couleur: 'bg-foret-50 text-foret-700'
		},
		{
			href: '/marches',
			icone: Landmark,
			titre: 'Décrocher des marchés',
			texte: "Appels d'offres publics et privés, annuaire d'entreprises, partenaires.",
			couleur: 'bg-fleuve-50 text-fleuve-700'
		},
		{
			href: '/emplois',
			icone: Briefcase,
			titre: 'Trouver un emploi',
			texte: "Publiez votre profil ou votre offre d'emploi, gratuitement.",
			couleur: 'bg-soleil-100 text-encre'
		}
	];

	// Preuve sociale honnête (ADR-0008) : un chiffre n'est affiché que s'il est significatif
	const chiffres = $derived(
		[
			{ valeur: `${new Date().getFullYear() - (s?.annee_creation ?? 2016)} ans`, label: 'aux côtés des entrepreneurs de Brazzaville', seuil: true },
			{ valeur: entier(s?.membres), label: 'membres inscrits', seuil: (s?.membres ?? 0) >= 500 },
			{ valeur: fcfa(s?.montant_promis), label: 'promis aux projets des membres', seuil: (s?.montant_promis ?? 0) >= 1_000_000 },
			{ valeur: entier(s?.produits), label: 'produits bien-être disponibles', seuil: (s?.produits ?? 0) >= 20 },
			{ valeur: '285', label: "domaines d'activité référencés", seuil: true }
		].filter((c) => c.seuil).slice(0, 4)
	);

	const etapes = [
		{ titre: 'Faites votre diagnostic', texte: '3 minutes, gratuit, sans créer de compte. Vous décrivez votre projet et vos besoins.' },
		{ titre: 'Votre frangine vous répond', texte: 'Une conseillère étudie vos réponses et vous propose un plan d’action concret.' },
		{ titre: 'On avance ensemble', texte: 'Épargne en Likelemba, financement, marchés, emplois : on vous ouvre les bonnes portes.' }
	];

	const faq = [
		{
			q: "C'est vraiment gratuit ?",
			r: "Oui. Le diagnostic, l'inscription, la publication d'annonces et les échanges avec votre frangine sont gratuits. Les services d'accompagnement avancés sont toujours annoncés et chiffrés avant."
		},
		{
			q: 'Qui est derrière La Frangine ?',
			r: `Une équipe basée à Brazzaville (${p.adresse}), active depuis 2016. Vous pouvez nous écrire sur WhatsApp, nous appeler ou passer nous voir.`
		},
		{
			q: 'Est-ce que La Frangine garde mon argent ?',
			r: "Non. Les cotisations et les apports passent directement entre membres (Mobile Money, Charden Farell, espèces). La Frangine enregistre, vérifie et trace : elle ne détient pas vos fonds."
		},
		{
			q: 'Pouvez-vous me prêter de l’argent ?',
			r: 'Nous ne prêtons pas. Nous préparons votre dossier avec vous et vous orientons vers les banques et dispositifs adaptés, et vous pouvez présenter votre projet aux membres.'
		},
		{
			q: "Je n'ai pas de compte Mobile Money, comment payer ?",
			r: 'Vous pouvez payer en espèces à notre bureau ou par Charden Farell. Chaque paiement reçoit une référence et est confirmé par un gestionnaire.'
		},
		{
			q: 'Comment reconnaître une arnaque ?',
			r: "La Frangine ne vous demandera jamais votre code PIN Mobile Money ni de payer sur un numéro personnel. Aucun recruteur n'a le droit de vous demander de l'argent pour un emploi : signalez-le-nous."
		}
	];

	const donneesStructurees = $derived(
		jsonLd([
			{
				'@context': 'https://schema.org',
				'@type': 'LocalBusiness',
				name: p.nom_site,
				description: 'Accompagnement des entrepreneurs, Likelemba, financement et opportunités au Congo.',
				address: { '@type': 'PostalAddress', streetAddress: p.adresse, addressLocality: 'Brazzaville', addressCountry: 'CG' },
				telephone: p.telephone_1 ? `+242${p.telephone_1}` : undefined,
				email: p.email || undefined,
				foundingDate: '2016'
			},
			{
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } }))
			}
		])
	);
</script>

<svelte:head>
	<title>{p.nom_site} — la grande sœur de ceux qui se lancent | Brazzaville, Pointe-Noire</title>
	<meta
		name="description"
		content="Conseil humain, Likelemba bien organisée, appels de fonds, marchés publics et emplois : La Frangine accompagne les entrepreneurs du Congo, de l'idée au premier client. Diagnostic gratuit en 3 minutes."
	/>
	<meta property="og:title" content="{p.nom_site} — la grande sœur de ceux qui se lancent" />
	<meta property="og:description" content="Diagnostic gratuit, Likelemba, financement et opportunités pour entreprendre au Congo." />
	<meta property="og:type" content="website" />
	{@html donneesStructurees}
</svelte:head>

<!-- 1. Hero -->
<section class="relative overflow-hidden bg-white">
	<div class="pagne pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-60 lg:block" aria-hidden="true"></div>
	<div class="conteneur relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
		<div>
			<p class="inline-flex items-center gap-2 rounded-full bg-foret-50 px-3 py-1 text-sm font-semibold text-foret-700">
				<span class="size-2 rounded-full bg-foret-600" aria-hidden="true"></span>
				{#if data.compteurs?.frangine_en_ligne}Une conseillère est en ligne{:else}Une vraie conseillère vous répond{/if}
			</p>
			<h1 class="mt-5 text-[clamp(2.25rem,8vw,4rem)] leading-[1.05] font-extrabold">
				Votre projet mérite <span class="text-laterite-600">une grande sœur.</span>
			</h1>
			<p class="mt-5 max-w-xl text-lg text-ardoise sm:text-xl">
				Conseils, Likelemba, financement et opportunités : La Frangine vous accompagne pas à pas, de l'idée au premier client.
			</p>
			<div class="mt-8 flex flex-col gap-3 sm:flex-row">
				<Bouton href="/diagnostic" taille="lg">
					Faire mon diagnostic gratuit <ArrowRight class="size-5" aria-hidden="true" />
				</Bouton>
				{#if p.whatsapp}
					<Bouton href={wa} variante="whatsapp" taille="lg" target="_blank" rel="noopener">
						<MessageCircle class="size-5" aria-hidden="true" /> Écrire à une conseillère
					</Bouton>
				{/if}
			</div>
			<ul class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-ardoise">
				<li class="flex items-center gap-1.5"><CircleCheck class="size-4 text-foret-600" aria-hidden="true" />3 minutes</li>
				<li class="flex items-center gap-1.5"><CircleCheck class="size-4 text-foret-600" aria-hidden="true" />Gratuit, sans engagement</li>
				<li class="flex items-center gap-1.5"><CircleCheck class="size-4 text-foret-600" aria-hidden="true" />Vos infos restent confidentielles</li>
			</ul>
		</div>

		<!-- Visuel produit (léger : HTML/CSS, pas d'image) -->
		<div class="relative mx-auto w-full max-w-md" aria-hidden="true">
			<div class="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-soleil-100 via-creme to-laterite-50"></div>
			<div class="relative space-y-4">
				<div class="carte rotate-[-2deg] p-5">
					<div class="flex items-center justify-between">
						<p class="font-display text-lg font-bold text-fleuve-700">Likelemba des commerçantes</p>
						<span class="rounded-full bg-foret-50 px-2.5 py-0.5 text-xs font-semibold text-foret-700">Tour 6 / 10</span>
					</div>
					<div class="mt-4 flex -space-x-2">
						{#each ['GM', 'AN', 'FK', 'PB', 'JM', 'RL'] as i, n (i)}
							<span class="grid size-10 place-items-center rounded-full text-xs font-bold ring-2 ring-white {n % 3 === 0 ? 'bg-laterite-100 text-laterite-700' : n % 3 === 1 ? 'bg-fleuve-100 text-fleuve-700' : 'bg-foret-100 text-foret-700'}">{i}</span>
						{/each}
						<span class="grid size-10 place-items-center rounded-full bg-sable text-xs font-bold text-ardoise ring-2 ring-white">+4</span>
					</div>
					<div class="mt-4 h-2.5 overflow-hidden rounded-full bg-sable"><div class="h-full w-4/5 rounded-full bg-foret-600"></div></div>
					<p class="mt-2 text-sm text-ardoise">8 membres sur 10 ont cotisé cette semaine · reçu envoyé</p>
				</div>
				<div class="carte ml-8 rotate-[1.5deg] p-5">
					<p class="text-xs font-semibold tracking-wide text-laterite-600 uppercase">Votre plan d'action</p>
					<ul class="mt-3 space-y-2 text-[15px]">
						<li class="flex items-center gap-2"><CircleCheck class="size-5 text-foret-600" />Diagnostic terminé</li>
						<li class="flex items-center gap-2"><CircleCheck class="size-5 text-foret-600" />Business plan en cours</li>
						<li class="flex items-center gap-2 text-ardoise"><span class="size-5 rounded-full border-2 border-fleuve-200"></span>Dossier de financement</li>
					</ul>
				</div>
				<div class="carte -ml-2 rotate-[-1deg] p-4">
					<div class="flex items-center gap-3">
						<span class="grid size-10 place-items-center rounded-xl bg-fleuve-50 text-fleuve-700"><Bell class="size-5" /></span>
						<div>
							<p class="font-semibold text-encre">Nouveau marché dans votre secteur</p>
							<p class="text-sm text-ardoise">Travaux de réhabilitation · Brazzaville</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- 2. Intentions -->
<section class="conteneur py-14 sm:py-20" aria-labelledby="titre-intentions">
	<h2 id="titre-intentions" class="text-[clamp(1.75rem,5vw,2.5rem)] font-bold">Que voulez-vous faire aujourd'hui ?</h2>
	<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each intentions as it (it.href)}
			<a href={it.href} class="carte group flex flex-col p-6 transition-shadow hover:shadow-levee">
				<span class="grid size-12 place-items-center rounded-2xl {it.couleur}"><it.icone class="size-6" aria-hidden="true" /></span>
				<h3 class="mt-5 text-xl font-bold">{it.titre}</h3>
				<p class="mt-2 flex-1 text-ardoise">{it.texte}</p>
				<span class="mt-5 inline-flex items-center gap-1 font-semibold text-fleuve-700 group-hover:gap-2 transition-all">
					C'est parti <ArrowRight class="size-4" aria-hidden="true" />
				</span>
			</a>
		{/each}
	</div>
</section>

<!-- 3. Preuve sociale (chiffres réels uniquement) -->
{#if chiffres.length}
	<section class="bg-fleuve-700 text-white">
		<div class="conteneur grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
			{#each chiffres as c (c.label)}
				<div>
					<p class="montant font-display text-4xl font-extrabold text-soleil-300">{c.valeur}</p>
					<p class="mt-1 text-fleuve-100">{c.label}</p>
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- 4. Comment ça marche -->
<section class="conteneur py-14 sm:py-20" aria-labelledby="titre-etapes">
	<div class="max-w-2xl">
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Comment ça marche</p>
		<h2 id="titre-etapes" class="mt-2 text-[clamp(1.75rem,5vw,2.5rem)] font-bold">Trois étapes, et vous n'êtes plus seul·e</h2>
	</div>
	<ol class="mt-10 grid gap-6 md:grid-cols-3">
		{#each etapes as e, i (e.titre)}
			<li class="relative rounded-2xl bg-white p-6 ring-1 ring-fleuve-900/5">
				<span class="grid size-12 place-items-center rounded-full bg-laterite-600 font-display text-xl font-extrabold text-white">{i + 1}</span>
				<h3 class="mt-5 text-xl font-bold">{e.titre}</h3>
				<p class="mt-2 text-ardoise">{e.texte}</p>
			</li>
		{/each}
	</ol>
	<div class="mt-10"><Bouton href="/diagnostic" taille="lg">Commencer mon diagnostic <ArrowRight class="size-5" aria-hidden="true" /></Bouton></div>
</section>

<!-- 5. Zoom Likelemba -->
<section class="bg-foret-700 text-white" aria-labelledby="titre-likelemba">
	<div class="conteneur grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
		<div>
			<p class="text-sm font-semibold tracking-wide text-soleil-300 uppercase">Likelemba</p>
			<h2 id="titre-likelemba" class="mt-2 text-[clamp(1.75rem,5vw,2.75rem)] font-bold text-white">Votre Likelemba, sans stress et sans cahier.</h2>
			<ul class="mt-6 space-y-3 text-lg text-foret-50">
				<li class="flex gap-3"><Users class="mt-1 size-5 shrink-0 text-soleil-300" aria-hidden="true" />Chaque membre voit qui a cotisé et quand</li>
				<li class="flex gap-3"><Receipt class="mt-1 size-5 shrink-0 text-soleil-300" aria-hidden="true" />Un reçu numéroté pour chaque versement</li>
				<li class="flex gap-3"><ShieldCheck class="mt-1 size-5 shrink-0 text-soleil-300" aria-hidden="true" />Cautions et témoins enregistrés pour chaque membre</li>
				<li class="flex gap-3"><TrendingUp class="mt-1 size-5 shrink-0 text-soleil-300" aria-hidden="true" />Hebdomadaire, par quinzaine ou mensuelle : à votre rythme</li>
			</ul>
			<div class="mt-8 flex flex-wrap gap-3">
				<!-- La création d'un groupe est faite par la frangine (règle legacy) : on l'installe ensemble -->
				<a
					href={lienWhatsApp(p.whatsapp, 'Bonjour la Frangine, je voudrais installer ma Likelemba sur La Frangine.')}
					target="_blank"
					rel="noopener"
					class="inline-flex min-h-14 items-center gap-2 rounded-xl bg-white px-7 text-lg font-semibold text-foret-700 hover:bg-foret-50"
				>
					Installer ma Likelemba <ArrowRight class="size-5" aria-hidden="true" />
				</a>
				<Bouton href="/likelemba" variante="clair" taille="lg">Voir les groupes</Bouton>
			</div>
		</div>
		<div class="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10" aria-hidden="true">
			<p class="font-display text-lg font-bold">Calendrier des tours</p>
			<ul class="mt-4 space-y-3">
				{#each [['Tour 5', 'Adèle N.', 'Reçu', true], ['Tour 6', 'Grâce M.', 'Cette semaine', false], ['Tour 7', 'Fabrice K.', 'Dans 7 jours', false]] as [tour, nom, quand, fait] (tour)}
					<li class="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
						<span><span class="font-semibold">{tour}</span> · {nom}</span>
						<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {fait ? 'bg-soleil-400 text-encre' : 'bg-white/15'}">{quand}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<!-- 6. Opportunités du moment -->
{#if data.aLaUne.length}
	<section class="conteneur py-14 sm:py-20" aria-labelledby="titre-opportunites">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Opportunités du moment</p>
				<h2 id="titre-opportunites" class="mt-2 text-[clamp(1.75rem,5vw,2.5rem)] font-bold">Ça bouge chez les membres</h2>
			</div>
			<a href="/opportunites" class="lien">Toutes les opportunités</a>
		</div>
		<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.aLaUne as o (o.href)}
				<a href={o.href} class="carte flex flex-col p-5 hover:shadow-levee">
					<span class="text-xs font-semibold tracking-wide text-laterite-600 uppercase">{o.type}</span>
					<span class="mt-2 font-display text-lg leading-snug font-bold text-fleuve-800">{tronquer(o.titre, 80)}</span>
					{#if o.detail}<span class="mt-1 text-[15px] text-ardoise">{tronquer(o.detail, 90)}</span>{/if}
					<span class="mt-auto pt-4 text-sm text-ardoise">{relatif(o.date)}</span>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- 7. Qui est la frangine -->
<section class="bg-sable" aria-labelledby="titre-frangine">
	<div class="conteneur grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.2fr]">
		<div class="relative mx-auto aspect-square w-full max-w-sm" aria-hidden="true">
			<div class="absolute inset-0 rounded-full bg-laterite-600/10"></div>
			<div class="absolute inset-6 rounded-full bg-fleuve-700/10"></div>
			<div class="absolute inset-12 grid place-items-center rounded-full bg-white shadow-levee">
				<Handshake class="size-24 text-laterite-600" strokeWidth={1.25} />
			</div>
		</div>
		<div>
			<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Qui est « la frangine » ?</p>
			<h2 id="titre-frangine" class="mt-2 text-[clamp(1.75rem,5vw,2.5rem)] font-bold">Une personne qui vous connaît, pas un robot</h2>
			<p class="mt-4 text-lg text-ardoise">
				Au Congo, la grande sœur, c'est celle qui conseille, présente les bonnes personnes et vous pousse à avancer. Nos
				conseillères font la même chose pour votre projet : elles lisent vos réponses, vous rappellent et restent
				joignables tout au long du chemin.
			</p>
			<ul class="mt-6 grid gap-3 sm:grid-cols-2">
				<li class="flex items-start gap-2"><ClipboardCheck class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />Suivi de votre fiche « Découverte de soi »</li>
				<li class="flex items-start gap-2"><MessageCircle class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />Messagerie privée et WhatsApp</li>
				<li class="flex items-start gap-2"><Landmark class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />Dossiers de crédit et d'accompagnement</li>
				<li class="flex items-start gap-2"><BadgeCheck class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />Vérification des annonces et des projets</li>
			</ul>
			<div class="mt-8 flex flex-wrap gap-3">
				{#if p.whatsapp}<Bouton href={wa} variante="whatsapp" target="_blank" rel="noopener"><MessageCircle class="size-5" aria-hidden="true" />WhatsApp</Bouton>{/if}
				{#if p.telephone_1}<Bouton href={lienTel(p.telephone_1)} variante="secondaire">Appeler le {telephone(p.telephone_1)}</Bouton>{/if}
			</div>
		</div>
	</div>
</section>

<!-- 8. Témoignages (uniquement de vraies réussites validées) -->
{#if data.temoignages.length}
	<section class="conteneur py-14 sm:py-20" aria-labelledby="titre-temoignages">
		<h2 id="titre-temoignages" class="text-[clamp(1.75rem,5vw,2.5rem)] font-bold">Ils se sont lancés</h2>
		<div class="mt-8 grid gap-4 md:grid-cols-3">
			{#each data.temoignages as t (t.id)}
				<figure class="carte flex flex-col p-6">
					<Quote class="size-8 text-soleil-400" aria-hidden="true" />
					<blockquote class="mt-3 flex-1 text-lg">{tronquer(t.succes || t.projet, 220)}</blockquote>
					<figcaption class="mt-5 flex items-center gap-3">
						<Avatar src={t.auteur.photo_url} nom={t.auteur.pseudonyme} />
						<span><span class="block font-semibold">{t.auteur.pseudonyme}</span>{#if t.secteur}<span class="block text-sm text-ardoise">{t.secteur}</span>{/if}</span>
					</figcaption>
				</figure>
			{/each}
		</div>
		<a href="/reussites" class="lien mt-6 inline-block">Lire toutes les réussites</a>
	</section>
{/if}

<!-- 9. Sécurité -->
<section class="conteneur py-14 sm:py-20" aria-labelledby="titre-securite">
	<div class="rounded-3xl bg-white p-6 ring-1 ring-fleuve-900/5 sm:p-10">
		<div class="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
			<div>
				<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Votre sécurité</p>
				<h2 id="titre-securite" class="mt-2 text-[clamp(1.75rem,5vw,2.25rem)] font-bold">Votre frangine ne vous demandera jamais…</h2>
				<p class="mt-3 text-ardoise">…votre code PIN Mobile Money, un transfert vers un numéro personnel, ni de l'argent pour un emploi. Si quelqu'un le fait en notre nom, c'est une arnaque : prévenez-nous.</p>
			</div>
			<ul class="grid gap-5 sm:grid-cols-2">
				<li class="flex gap-3"><BadgeCheck class="size-7 shrink-0 text-foret-600" aria-hidden="true" /><span><strong class="block">Annonces relues</strong><span class="text-ardoise">Les fiches publiées sont vérifiées par un gestionnaire.</span></span></li>
				<li class="flex gap-3"><Receipt class="size-7 shrink-0 text-foret-600" aria-hidden="true" /><span><strong class="block">Paiements tracés</strong><span class="text-ardoise">Chaque paiement a une référence et est confirmé.</span></span></li>
				<li class="flex gap-3"><Lock class="size-7 shrink-0 text-foret-600" aria-hidden="true" /><span><strong class="block">Données protégées</strong><span class="text-ardoise">Mots de passe chiffrés, téléphone jamais affiché.</span></span></li>
				<li class="flex gap-3"><ShieldCheck class="size-7 shrink-0 text-foret-600" aria-hidden="true" /><span><strong class="block">Vos fonds restent à vous</strong><span class="text-ardoise">La Frangine ne détient pas l'argent des Likelemba.</span></span></li>
			</ul>
		</div>
	</div>
</section>

<!-- Encart publicitaire (legacy : widget de l'accueil, F-TRV-04 / F-TRV-43) -->
{#if data.publicites.length}
	<section class="conteneur pb-14 sm:pb-20" aria-label="Annonceurs">
		<EncartPublicites publicites={data.publicites} variante="bande" />
	</section>
{/if}

<!-- 10. FAQ -->
<section class="conteneur pb-14 sm:pb-20" aria-labelledby="titre-faq">
	<h2 id="titre-faq" class="text-[clamp(1.75rem,5vw,2.5rem)] font-bold">Vos questions</h2>
	<div class="mt-8 grid gap-3 lg:grid-cols-2">
		{#each faq as f (f.q)}
			<details class="group carte p-5">
				<summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-fleuve-800">
					{f.q}
					<span class="grid size-8 shrink-0 place-items-center rounded-full bg-sable transition-transform group-open:rotate-45" aria-hidden="true">+</span>
				</summary>
				<p class="mt-3 text-ardoise">{f.r}</p>
			</details>
		{/each}
	</div>
</section>

<!-- 11. CTA final -->
<section class="conteneur">
	<div class="relative overflow-hidden rounded-3xl bg-fleuve-700 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
		<div class="pagne pointer-events-none absolute inset-0 opacity-30" aria-hidden="true"></div>
		<h2 class="relative text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold text-white">Et si on commençait aujourd'hui ?</h2>
		<p class="relative mx-auto mt-3 max-w-xl text-lg text-fleuve-100">Trois minutes pour faire le point. Votre frangine s'occupe du reste.</p>
		<div class="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
			<Bouton href="/diagnostic" taille="lg">Faire mon diagnostic gratuit</Bouton>
			<Bouton href="/inscription" variante="clair" taille="lg">Créer mon compte</Bouton>
		</div>
	</div>
</section>
