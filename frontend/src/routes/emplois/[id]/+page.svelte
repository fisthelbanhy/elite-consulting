<script lang="ts">
	import { page } from '$app/state';
	import Eye from '@lucide/svelte/icons/eye';
	import FileText from '@lucide/svelte/icons/file-text';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import { champ } from '$lib/forms';
	import { age, date, dateHeure, jsonLd, libelle, lienPartageWhatsApp, lienTel, lienWhatsApp, telephone, tronquer } from '$lib/format';

	let { data, form } = $props();
	const a = $derived(data.annonce);
	const offre = $derived(a.type_annonce === 2);
	const titre = $derived(offre ? a.poste_a_pourvoir || "Offre d'emploi" : tronquer(a.competences, 70) || "Demande d'emploi");
	const connecte = $derived(!!data.membre);
	const estAuteur = $derived(!!data.membre && a.auteur?.id === data.membre.id);
	const partage = $derived(lienPartageWhatsApp(`${titre} — ${page.url.href}`));

	const donneesStructurees = $derived(
		offre
			? jsonLd({
					'@context': 'https://schema.org',
					'@type': 'JobPosting',
					title: titre,
					description: [a.competences, a.experience, a.autres_informations].filter(Boolean).join('\n\n') || titre,
					datePosted: a.date_creation,
					identifier: { '@type': 'PropertyValue', name: data.parametres.nom_site, value: a.reference },
					hiringOrganization: { '@type': 'Organization', name: a.auteur?.pseudonyme ?? data.parametres.nom_site },
					jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Brazzaville', addressCountry: 'CG' } },
					educationRequirements: a.diplomes || undefined,
					industry: a.domaine?.libelle
				})
			: null
	);
</script>

<svelte:head>
	<title>{titre} ({a.reference}) — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`${offre ? "Offre d'emploi" : "Demande d'emploi"} ${a.domaine?.libelle ?? ''} : ${a.competences}`, 155)} />
	{#if donneesStructurees}{@html donneesStructurees}{/if}
</svelte:head>

<EnTetePage
	{titre}
	surtitre={offre ? "Offre d'emploi" : "Demande d'emploi"}
	fil={[{ href: '/emplois', label: 'Emplois' }, { href: `/emplois?type=${a.type_annonce}`, label: offre ? 'Offres' : 'Demandes' }]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Votre fiche est publiée.">Référence {a.reference}. Vous pouvez la modifier à tout moment.</Alerte>{/if}

		<section class="carte p-6">
			<div class="flex flex-wrap items-start gap-5">
				{#if !offre}<Avatar src={a.photo_url} nom={titre} taille="xl" />{/if}
				<div class="min-w-0 flex-1 space-y-2">
					<div class="flex flex-wrap gap-2">
						<Badge ton={offre ? 'laterite' : 'fleuve'}>{a.reference}</Badge>
						{#if a.domaine}<Badge>{a.domaine.libelle}</Badge>{/if}
					</div>
					<dl class="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
						{#if !offre && a.sexe !== 3}<div><dt class="text-ardoise">Sexe</dt><dd class="font-semibold">{libelle(data.enums, 'Sexe', a.sexe)}</dd></div>{/if}
						{#if !offre && a.date_naissance}<div><dt class="text-ardoise">Âge</dt><dd class="font-semibold">{age(a.date_naissance)}</dd></div>{/if}
						{#if a.diplomes}<div><dt class="text-ardoise">Diplômes</dt><dd class="font-semibold">{a.diplomes}</dd></div>{/if}
						<div><dt class="text-ardoise">Publiée le</dt><dd class="font-semibold">{date(a.date_creation)}</dd></div>
						{#if offre && a.auteur}<div><dt class="text-ardoise">Publiée par</dt><dd class="font-semibold">{a.auteur.pseudonyme}</dd></div>{/if}
						<div>
							<dt class="text-ardoise">Consultations</dt>
							<dd class="flex items-center gap-1 font-semibold"><Eye class="size-4" aria-hidden="true" />{a.nombre_visites}{#if a.date_derniere_visite}<span class="font-normal text-ardoise"> · dernière {dateHeure(a.date_derniere_visite)}</span>{/if}</dd>
						</div>
					</dl>
				</div>
			</div>
		</section>

		{#each [[offre ? 'Compétences requises' : 'Compétences', a.competences], ['Expérience professionnelle', a.experience], ['Autres informations', a.autres_informations]] as [t, v] (t)}
			{#if v}
				<section class="carte p-6">
					<h2 class="text-xl font-bold">{t}</h2>
					<p class="mt-3 whitespace-pre-line">{v}</p>
				</section>
			{/if}
		{/each}

		{#if a.cv_url}
			{#if connecte}
				<Bouton href={a.cv_url} variante="secondaire" target="_blank" rel="noopener"><FileText class="size-5" aria-hidden="true" />Télécharger le CV (PDF)</Bouton>
			{:else}
				<p class="flex items-center gap-2 text-ardoise"><Lock class="size-4" aria-hidden="true" />Un CV est joint : <a href="/connexion?suite={page.url.pathname}" class="lien">connectez-vous</a> pour le télécharger.</p>
			{/if}
		{/if}

		<!-- Contributions reçues : auteur et gestionnaires seulement (ADR-0007 S2d) -->
		{#if a.interets}
			<section class="carte p-6">
				<h2 class="text-xl font-bold">{offre ? 'Candidat·es intéressé·es' : 'Recruteurs intéressés'} ({a.interets.length})</h2>
				{#if a.interets.length}
					<ul class="mt-4 divide-y divide-fleuve-900/5">
						{#each a.interets as i (i.id)}
							<li class="py-4">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<p class="font-semibold">{i.membre?.pseudonyme ?? 'Membre'} <span class="font-normal text-ardoise">· {i.membre?.nom}</span></p>
									<span class="text-sm text-ardoise">{dateHeure(i.date_creation)}</span>
								</div>
								{#if i.message}<p class="mt-1 whitespace-pre-line text-[15px]">{i.message}</p>{/if}
								{#if i.membre}
									<p class="mt-2 flex flex-wrap gap-4 text-sm">
										{#if i.membre.telephone}<a href={lienTel(i.membre.telephone)} class="lien">{telephone(i.membre.telephone)}</a>
											<a href={lienWhatsApp(i.membre.telephone, `Bonjour, je vous contacte au sujet de l'annonce ${a.reference} sur La Frangine.`)} target="_blank" rel="noopener" class="font-semibold text-foret-700">WhatsApp</a>{/if}
										{#if i.membre.email}<a href="mailto:{i.membre.email}" class="lien">{i.membre.email}</a>{/if}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-2 text-ardoise">Aucune manifestation pour l'instant. Partagez votre fiche sur WhatsApp pour gagner en visibilité.</p>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		{#if a.telephone || a.email || a.nom}
			<section class="carte space-y-3 p-5">
				<h2 class="flex items-center gap-2 text-lg font-bold"><Lock class="size-4 text-foret-600" aria-hidden="true" />Coordonnées privées</h2>
				<p class="text-sm text-ardoise">Visibles uniquement par vous et la frangine.</p>
				{#if a.nom}<p class="font-semibold">{a.nom} {a.prenom}</p>{/if}
				{#if a.telephone}<p class="flex items-center gap-2"><Phone class="size-4" aria-hidden="true" />{telephone(a.telephone)}</p>{/if}
				{#if a.email}<p class="flex items-center gap-2"><Mail class="size-4" aria-hidden="true" />{a.email}</p>{/if}
				{#if a.adresse}<p class="flex items-center gap-2"><MapPin class="size-4" aria-hidden="true" />{a.adresse}</p>{/if}
			</section>
		{/if}

		{#if !estAuteur}
			<section class="carte p-5">
				<h2 class="text-lg font-bold">{offre ? 'Ce poste vous intéresse ?' : 'Ce profil vous intéresse ?'}</h2>
				{#if !connecte}
					<p class="mt-2 text-[15px] text-ardoise">Créez votre compte gratuit pour vous manifester. La frangine transmet votre message.</p>
					<div class="mt-4 space-y-2">
						<Bouton href="/inscription?suite={page.url.pathname}" pleineLargeur>{offre ? 'Postuler' : 'Contacter ce profil'}</Bouton>
						<Bouton href="/connexion?suite={page.url.pathname}" variante="fantome" pleineLargeur>J'ai déjà un compte</Bouton>
					</div>
				{:else if a.mon_interet || form?.succes}
					<Alerte type="succes" titre={form?.succes ?? 'Vous vous êtes déjà manifesté·e.'} class="mt-3">L'auteur de la fiche a été prévenu.</Alerte>
				{:else}
					<Formulaire action="?/interet" {form} cle="interet" class="mt-3">
						{#snippet children({ envoi })}
							<Zone
								label={offre ? 'Votre message (facultatif)' : 'Présentez votre besoin'}
								lignes={4}
								requis={!offre}
								placeholder={offre ? 'Quelques mots sur vous, vos disponibilités…' : 'Poste proposé, lieu, conditions…'}
								{...champ(form, 'message', '', 'interet')}
							/>
							<Bouton type="submit" pleineLargeur chargement={envoi} class="mt-4">{offre ? 'Je suis intéressé·e' : 'Envoyer ma proposition'}</Bouton>
						{/snippet}
					</Formulaire>
				{/if}
			</section>
		{/if}

		<PanneauModeration
			etat={a.etat}
			peutModerer={a.peut_moderer}
			peutModifier={a.peut_modifier}
			lienModifier="/emplois/{a.id}/modifier"
			{form}
		/>
	</aside>
</div>
