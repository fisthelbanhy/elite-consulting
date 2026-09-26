<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import ACompleter from '$lib/components/contact/ACompleter.svelte';
	import { telephone } from '$lib/format';

	let { data } = $props();
	const p = $derived(data.parametres);
</script>

<svelte:head>
	<title>Mentions légales — {p.nom_site}</title>
	<meta name="description" content="Mentions légales de La Frangine : éditeur, hébergeur, propriété intellectuelle et contact." />
</svelte:head>

<EnTetePage titre="Mentions légales" surtitre="Informations légales" fil={[{ href: '/mentions-legales', label: 'Mentions légales' }]} />

<article class="conteneur max-w-3xl py-10">
	<div class="prose max-w-none prose-headings:font-display prose-headings:text-fleuve-700 prose-a:text-fleuve-700">
		<p class="lead">Dernière mise à jour : 22 septembre 2026.</p>

		<h2>Éditeur du site</h2>
		<p>
			Le site <strong>{p.nom_site}</strong> est édité par <strong>Primera-C</strong>, <ACompleter quoi="raison sociale exacte et forme juridique" />, au
			capital de <ACompleter quoi="montant du capital social" />.
		</p>
		<ul>
			<li>RCCM : <ACompleter quoi="numéro d'immatriculation au RCCM" /></li>
			<li>NIU : <ACompleter quoi="numéro d'identification unique" /></li>
			<li>Siège : {p.adresse || 'Brazzaville'}, République du Congo</li>
			{#if p.telephone_1}<li>Téléphone : {telephone(p.telephone_1)}{#if p.telephone_2} · {telephone(p.telephone_2)}{/if}</li>{/if}
			{#if p.email}<li>E-mail : <a href="mailto:{p.email}">{p.email}</a></li>{/if}
		</ul>
		<p>Directeur ou directrice de la publication : <ACompleter quoi="nom et fonction" />.</p>

		<h2>Conception et réalisation</h2>
		<p>Primera-C, Brazzaville.</p>

		<h2>Hébergement</h2>
		<p><ACompleter quoi="nom, adresse et téléphone de l'hébergeur, pays d'hébergement des données" /></p>

		<h2>Propriété intellectuelle</h2>
		<p>
			La marque {p.nom_site}, le logo, les textes, illustrations et la présentation du site sont protégés. Toute reproduction sans
			autorisation écrite est interdite.
		</p>
		<p>
			Les membres restent propriétaires des contenus qu'ils publient (annonces, photos, témoignages). En les publiant, ils autorisent
			{p.nom_site} à les afficher sur le site et à les partager pour faire connaître l'annonce, pendant toute la durée de la publication.
		</p>

		<h2>Contenus publiés par les membres et publicités</h2>
		<p>
			Les annonces, offres et projets sont rédigés par les membres, sous leur responsabilité, et relus par l'équipe. Les publicités sont
			signalées comme telles ; les annonceurs sont seuls responsables de leurs offres. Pour signaler un contenu illicite ou une arnaque,
			<a href="/contact?objet={encodeURIComponent('Signalement d’un contenu')}">écrivez-nous</a> : nous le retirons dès que possible.
		</p>

		<h2>Données personnelles</h2>
		<p>Le traitement de vos données est décrit dans notre <a href="/confidentialite">politique de confidentialité</a>.</p>

		<h2>Droit applicable</h2>
		<p>
			Le site et ses conditions d'utilisation sont soumis au droit de la République du Congo. Juridiction compétente :
			<ACompleter quoi="tribunal compétent, à valider par un juriste" />.
		</p>
	</div>
</article>
