<script lang="ts">
	import { page } from '$app/state';
	import Share2 from '@lucide/svelte/icons/share-2';
	import FileText from '@lucide/svelte/icons/file-text';
	import Lock from '@lucide/svelte/icons/lock';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Eye from '@lucide/svelte/icons/eye';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import ChiffresProjet from '$lib/components/projets/ChiffresProjet.svelte';
	import FormulaireApport from '$lib/components/projets/FormulaireApport.svelte';
	import ListeApports from '$lib/components/projets/ListeApports.svelte';
	import EvaluationProjet from '$lib/components/projets/EvaluationProjet.svelte';
	import AvertissementProjets from '$lib/components/projets/AvertissementProjets.svelte';
	import { date, dateHeure, lienPartageWhatsApp, lienTel, telephone, tronquer } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.projet);
	const partage = $derived(lienPartageWhatsApp(`Soutenez le projet « ${p.nom_projet} » sur La Frangine : ${page.url.href}`));
	const succesApport = $derived(form?.cle === 'apport' && 'succes' in form ? (form as { succes: string; id?: number }) : null);
</script>

<svelte:head>
	<title>{p.nom_projet} ({p.reference}) — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`Appel de fonds : ${p.objet_projet}. ${p.description_projet}`, 155)} />
</svelte:head>

<EnTetePage
	titre={p.nom_projet}
	sousTitre={p.objet_projet}
	surtitre="Appel de fonds"
	fil={[{ href: '/projets', label: 'Appels de fonds' }, { href: `/projets/${p.id}`, label: p.reference }]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
	{#if p.presentation_url}
		<Bouton href={p.presentation_url} variante="secondaire" target="_blank" rel="noopener"><FileText class="size-5" aria-hidden="true" />Dossier PDF</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Votre projet est publié.">Référence {p.reference}. Partagez-le sur WhatsApp pour le faire connaître.</Alerte>{/if}

		{#if p.photo_url}<img src={p.photo_url} alt="Photo du projet {p.nom_projet}" class="carte aspect-[16/8] w-full object-cover" />{/if}

		<ChiffresProjet projet={p} />

		{#each [['Le projet', p.description_projet], ["L'activité du porteur", p.description_activite]] as [titre, texte] (titre)}
			{#if texte}
				<section class="carte p-6">
					<h2 class="text-xl font-bold">{titre}</h2>
					<p class="mt-3 whitespace-pre-line">{texte}</p>
				</section>
			{/if}
		{/each}

		{#if p.apports}
			<section class="carte p-6" aria-labelledby="titre-apports">
				<h2 id="titre-apports" class="text-xl font-bold">Apports promis ({p.apports.length})</h2>
				<p class="mt-1 text-sm text-ardoise">Visible uniquement par vous et la frangine. Chaque versement reçu est confirmé par notre caisse.</p>
				{#if p.apports.length}
					<ListeApports apports={p.apports} enums={data.enums} afficherProjet={false} />
				{:else}
					<p class="mt-3 text-ardoise">Aucune promesse pour l'instant. Partagez votre projet sur WhatsApp pour gagner en visibilité.</p>
				{/if}
			</section>
		{:else if p.mes_apports.length}
			<section class="carte p-6" aria-labelledby="titre-mes-apports">
				<h2 id="titre-mes-apports" class="text-xl font-bold">Mes apports à ce projet</h2>
				<ListeApports apports={p.mes_apports} enums={data.enums} afficherProjet={false} />
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		{#if !p.est_auteur}
			<section class="carte p-5" aria-labelledby="titre-soutien">
				<h2 id="titre-soutien" class="flex items-center gap-2 text-lg font-bold"><HandCoins class="size-5 text-laterite-600" aria-hidden="true" />Soutenir ce projet</h2>
				{#if succesApport}
					<Alerte type="succes" titre={succesApport.succes} class="mt-3">
						Le porteur est prévenu. Vous pourrez déclarer vos versements depuis
						<a href="/projets/apports/{succesApport.id}" class="underline">la fiche de votre apport</a>.
					</Alerte>
				{:else if !data.membre}
					<p class="mt-2 text-[15px] text-ardoise">Créez votre compte gratuit pour promettre un don, un prêt ou une prise de participation.</p>
					<div class="mt-4 space-y-2">
						<Bouton href="/inscription?suite={page.url.pathname}" pleineLargeur>Je soutiens ce projet</Bouton>
						<Bouton href="/connexion?suite={page.url.pathname}" variante="fantome" pleineLargeur>J'ai déjà un compte</Bouton>
					</div>
				{:else if p.peut_apporter}
					<div class="mt-4"><FormulaireApport {form} besoin={p.besoin_financement} /></div>
				{:else}
					<p class="mt-2 text-[15px] text-ardoise">Ce projet n'accepte pas de nouveaux apports pour le moment.</p>
				{/if}
				<AvertissementProjets class="mt-4 text-sm" />
			</section>
		{/if}

		{#if p.nom_promoteur}
			<section class="carte space-y-3 p-5" aria-labelledby="titre-promoteur">
				<h2 id="titre-promoteur" class="flex items-center gap-2 text-lg font-bold"><Lock class="size-4 text-foret-600" aria-hidden="true" />Promoteur</h2>
				<p class="text-sm text-ardoise">Visible uniquement par le porteur et la frangine.</p>
				<p class="font-semibold">{p.nom_promoteur}</p>
				{#if p.telephone_promoteur}<p class="flex items-center gap-2"><Phone class="size-4" aria-hidden="true" /><a href={lienTel(p.telephone_promoteur)} class="lien">{telephone(p.telephone_promoteur)}</a></p>{/if}
				{#if p.email_promoteur}<p class="flex items-center gap-2"><Mail class="size-4" aria-hidden="true" />{p.email_promoteur}</p>{/if}
				{#if p.adresse_promoteur}<p class="flex items-center gap-2"><MapPin class="size-4" aria-hidden="true" />{p.adresse_promoteur}</p>{/if}
			</section>
		{/if}

		<section class="carte p-5" aria-labelledby="titre-fiche">
			<h2 id="titre-fiche" class="text-lg font-bold">Fiche du projet</h2>
			<dl class="mt-3 space-y-2 text-[15px]">
				<div class="flex justify-between gap-3"><dt class="text-ardoise">Référence</dt><dd><Badge ton="fleuve">{p.reference}</Badge></dd></div>
				{#if p.secteur}<div class="flex justify-between gap-3"><dt class="text-ardoise">Secteur</dt><dd class="text-right font-semibold">{p.secteur.libelle}</dd></div>{/if}
				{#if p.ville}<div class="flex justify-between gap-3"><dt class="text-ardoise">Ville</dt><dd class="font-semibold">{p.ville.nom}</dd></div>{/if}
				{#if p.entreprise}<div class="flex justify-between gap-3"><dt class="text-ardoise">Entreprise</dt><dd class="text-right font-semibold">{p.entreprise.nom}</dd></div>{/if}
				{#if p.auteur}<div class="flex justify-between gap-3"><dt class="text-ardoise">Porté par</dt><dd class="font-semibold">{p.auteur.pseudonyme}</dd></div>{/if}
				<div class="flex justify-between gap-3"><dt class="text-ardoise">Publié le</dt><dd>{date(p.date_creation)}</dd></div>
				<div class="flex justify-between gap-3">
					<dt class="text-ardoise">Consultations</dt>
					<dd class="flex items-center gap-1"><Eye class="size-4" aria-hidden="true" />{p.nombre_visites}</dd>
				</div>
				{#if p.date_derniere_visite}<div class="flex justify-between gap-3"><dt class="text-ardoise">Dernière visite</dt><dd>{dateHeure(p.date_derniere_visite)}</dd></div>{/if}
			</dl>
		</section>

		<EvaluationProjet projet={p} {form} />

		<PanneauModeration etat={p.etat} peutModerer={p.peut_moderer} peutModifier={p.peut_modifier} lienModifier="/projets/{p.id}/modifier" {form} />
	</aside>
</div>
