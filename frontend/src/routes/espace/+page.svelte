<script lang="ts">
	/** « Mon espace » : accueil chaleureux, complétion du profil, raccourcis, mes fiches, mes paiements. */
	import Compass from '@lucide/svelte/icons/compass';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Users from '@lucide/svelte/icons/users';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Wallet from '@lucide/svelte/icons/wallet';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import OngletsEspace from '$lib/components/espace/OngletsEspace.svelte';
	import CarteModule from '$lib/components/espace/CarteModule.svelte';
	import { date, dateCourte, dateHeure, fcfa, libelle, lienWhatsApp } from '$lib/format';

	let { data } = $props();
	const t = $derived(data.tableau);
	const p = $derived(t.profil);
	const wa = $derived(data.parametres.whatsapp);
	const raccourcis = [
		{ href: '/diagnostic', titre: 'Mon diagnostic gratuit', texte: '3 minutes pour savoir par où commencer', icone: Compass },
		{ href: '/likelemba', titre: 'Likelemba', texte: 'Créer ou rejoindre une tontine organisée', icone: Users },
		{ href: '/emplois/publier', titre: 'Publier une offre ou mon profil', texte: 'Emplois : recruter ou être recruté·e', icone: Briefcase },
		{ href: '/projets', titre: 'Présenter un projet', texte: 'Trouver des soutiens pour le financer', icone: Rocket }
	];
	const tonPaiement = { 1: 'alerte', 2: 'soleil', 3: 'foret' } as const;
</script>

<svelte:head>
	<title>Mon espace — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage titre="Mbote {p.pseudonyme} !" sousTitre="Votre frangine est là pour vous accompagner, pas à pas." surtitre="Mon espace">
	{#if data.membre?.est_gestionnaire}
		<Bouton href="/gestion" variante="secondaire"><ShieldCheck class="size-5" aria-hidden="true" />Aller à la gestion</Bouton>
	{/if}
	{#snippet bas()}<OngletsEspace messages={t.messages_non_lus} />{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if data.bienvenue}
		<Alerte type="succes" titre="Bienvenue dans la famille, {p.pseudonyme} !">
			Votre compte est créé. Complétez votre profil quand vous le souhaitez, et écrivez-nous au moindre doute : une vraie
			conseillère vous répond.
		</Alerte>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
		<section class="carte pagne p-6" aria-labelledby="titre-profil">
			<div class="flex flex-wrap items-center gap-4 rounded-xl bg-white/90 p-1">
				<Avatar src={p.photo_url} nom={p.pseudonyme} taille="lg" />
				<div class="min-w-0 flex-1">
					<h2 id="titre-profil" class="text-xl font-bold">Mon profil est complet à {p.profil_complet} %</h2>
					<div class="mt-2 max-w-md"><Jauge valeur={p.profil_complet} max={100} label="Complétion du profil" couleur={p.profil_complet >= 100 ? 'foret' : 'laterite'} /></div>
					{#if p.champs_manquants.length}
						<p class="mt-2 text-[15px] text-ardoise">Il manque : {p.champs_manquants.join(', ')}. Un profil complet inspire confiance aux autres membres.</p>
					{:else}
						<p class="mt-2 text-[15px] text-foret-700">Bravo, votre profil est complet !</p>
					{/if}
				</div>
				{#if p.champs_manquants.length}<Bouton href="/espace/profil">Compléter mon profil</Bouton>{/if}
			</div>
			<dl class="mt-4 grid gap-3 text-[15px] sm:grid-cols-3">
				<div class="rounded-xl bg-white/90 p-3"><dt class="text-sm text-ardoise">Code membre</dt><dd class="font-semibold">{p.code_membre || '—'}</dd></div>
				<div class="rounded-xl bg-white/90 p-3"><dt class="text-sm text-ardoise">Membre depuis</dt><dd class="font-semibold">{date(p.date_creation)}</dd></div>
				<div class="rounded-xl bg-white/90 p-3">
					<dt class="text-sm text-ardoise">Statut</dt>
					<dd class="font-semibold">
						{libelle(data.enums, 'TypeMembre', p.type_compte)}{p.type_compte === 2 && p.date_limite_master ? ` jusqu'au ${dateCourte(p.date_limite_master)}` : ''}
						{#if p.etat === 1}<Badge ton="soleil" class="ml-1">en cours de validation</Badge>{/if}
					</dd>
				</div>
			</dl>
		</section>

		<aside class="space-y-4">
			<section class="carte p-5" aria-labelledby="titre-frangine">
				<h2 id="titre-frangine" class="text-lg font-bold">Une question ?</h2>
				<p class="mt-1 text-[15px] text-ardoise">Écrivez à votre frangine : réponse rapide, en toute confidentialité.</p>
				<div class="mt-3 flex flex-col gap-2">
					<Bouton href="/espace/messages" variante="secondaire" pleineLargeur>
						<Mail class="size-5" aria-hidden="true" />Mes messages{t.messages_non_lus ? ` (${t.messages_non_lus} non lu${t.messages_non_lus > 1 ? 's' : ''})` : ''}
					</Bouton>
					{#if wa}
						<Bouton href={lienWhatsApp(wa, `Bonjour la Frangine, c'est ${p.pseudonyme} (${p.code_membre}).`)} variante="whatsapp" pleineLargeur target="_blank" rel="noopener">
							<MessageCircle class="size-5" aria-hidden="true" />WhatsApp
						</Bouton>
					{/if}
				</div>
			</section>
			{#if p.point_caisse_actif && data.parametres.module_epargne_actif}
				<section class="carte p-5" aria-labelledby="titre-carte">
					<h2 id="titre-carte" class="flex items-center gap-2 text-lg font-bold"><CreditCard class="size-5 text-fleuve-600" aria-hidden="true" />Ma carte de pointage</h2>
					<p class="montant mt-2 font-display text-2xl font-bold">{fcfa(p.solde_point_caisse)}</p>
					<p class="text-sm text-ardoise">Dernier pointage : {dateHeure(p.date_dernier_pointage)}</p>
					<p class="mt-2 text-sm text-ardoise">La Frangine ne vous demandera jamais votre code de pointage.</p>
				</section>
			{/if}
		</aside>
	</div>

	<section aria-labelledby="titre-raccourcis">
		<h2 id="titre-raccourcis" class="mb-3 text-xl font-bold">Que voulez-vous faire aujourd'hui ?</h2>
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each raccourcis as r (r.href)}
				<li>
					<a href={r.href} class="carte flex h-full items-start gap-3 p-4 transition-shadow hover:shadow-levee">
						<span class="grid size-11 shrink-0 place-items-center rounded-xl bg-laterite-50 text-laterite-700"><r.icone class="size-6" aria-hidden="true" /></span>
						<span>
							<span class="block font-semibold text-fleuve-800">{r.titre}</span>
							<span class="block text-sm text-ardoise">{r.texte}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="titre-fiches">
		<h2 id="titre-fiches" class="mb-3 text-xl font-bold">Mes fiches</h2>
		{#if t.modules.length}
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each t.modules as m (m.cle)}<CarteModule module={m} />{/each}
			</div>
		{:else}
			<div class="carte flex flex-col items-center px-6 py-10 text-center">
				<span class="mb-3 grid size-14 place-items-center rounded-full bg-sable text-fleuve-600"><Sparkles class="size-7" aria-hidden="true" /></span>
				<p class="text-lg font-semibold">Vous n'avez encore rien publié.</p>
				<p class="mt-1 max-w-md text-ardoise">Une offre d'emploi, une annonce, un projet à financer : tout ce que vous publiez apparaîtra ici.</p>
			</div>
		{/if}
	</section>

	<section aria-labelledby="titre-paiements">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="titre-paiements" class="text-xl font-bold">Mes paiements</h2>
			{#if t.paiements.length}<a href="/espace/paiements" class="lien">Tout l'historique</a>{/if}
		</div>
		{#if t.paiements.length}
			{#if t.paiements_en_attente}
				<p class="mb-3 text-[15px] text-ardoise">{t.paiements_en_attente} paiement{t.paiements_en_attente > 1 ? 's' : ''} en cours de vérification par notre caisse.</p>
			{/if}
			<ul class="carte divide-y divide-fleuve-900/5">
				{#each t.paiements as pa (pa.id)}
					<li class="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
						<span>
							<span class="block font-medium">{libelle(data.enums, 'TypeObjetPaye', pa.type_objet)} · {libelle(data.enums, 'ModePaiement', pa.mode)}</span>
							<span class="block text-sm text-ardoise">{dateHeure(pa.date_paiement)}</span>
						</span>
						<span class="flex items-center gap-3">
							<span class="montant font-semibold">{fcfa(pa.montant)}</span>
							<Badge ton={tonPaiement[pa.etat as 1 | 2 | 3] ?? 'neutre'}>{libelle(data.enums, 'EtatPaiement', pa.etat)}</Badge>
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="carte flex items-center gap-3 p-5 text-ardoise"><Wallet class="size-5" aria-hidden="true" />Aucun paiement pour l'instant.</p>
		{/if}
	</section>
</div>
