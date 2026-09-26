<script lang="ts">
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import ACompleter from '$lib/components/contact/ACompleter.svelte';

	let { data } = $props();
	const p = $derived(data.parametres);
	const signaler = `/contact?objet=${encodeURIComponent('Signalement d’une arnaque')}`;
</script>

<svelte:head>
	<title>Conditions d'utilisation — {p.nom_site}</title>
	<meta
		name="description"
		content="Conditions générales d'utilisation de La Frangine : règles de publication, prévention des arnaques, paiements et responsabilités."
	/>
</svelte:head>

<EnTetePage
	titre="Conditions d'utilisation"
	surtitre="Informations légales"
	sousTitre="Les règles du jeu, pour que La Frangine reste un lieu de confiance pour tout le monde."
	fil={[{ href: '/conditions', label: "Conditions d'utilisation" }]}
/>

<article class="conteneur max-w-3xl py-10">
	<div class="prose max-w-none prose-headings:font-display prose-headings:text-fleuve-700 prose-a:text-fleuve-700">
		<p class="lead">Dernière mise à jour : 22 septembre 2026. En utilisant le site ou en créant un compte, vous acceptez ces conditions.</p>

		<h2>1. Le service</h2>
		<p>
			{p.nom_site} (édité par Primera-C, <ACompleter quoi="raison sociale, RCCM et NIU" />) est une plateforme d'accompagnement et de mise en
			relation pour les personnes qui se lancent : conseils, outils (diagnostic, business plan, Likelemba), annonces, offres d'emploi,
			marchés et boutique. Sauf pour ses propres produits et services, {p.nom_site} n'est pas partie aux accords passés entre membres.
		</p>

		<h2>2. Votre compte</h2>
		<ul>
			<li>Les informations de votre profil doivent être exactes ; un seul compte par personne ou par entreprise.</li>
			<li>Votre mot de passe est personnel : ne le communiquez à personne, pas même à l'équipe.</li>
			<li>L'équipe peut suspendre ou supprimer un compte qui enfreint ces règles, après vous en avoir informé·e sauf urgence (fraude, danger).</li>
		</ul>

		<h2>3. Règles de publication</h2>
		<p>Tout ce que vous publiez (annonce, offre, projet, question, témoignage, photo) doit :</p>
		<ul>
			<li>être <strong>vrai et à jour</strong> : un bien vendu, un poste pourvu ou un projet abandonné se retire ;</li>
			<li>être <strong>légal</strong> : pas de produit interdit, contrefait ou volé, pas d'activité non autorisée ;</li>
			<li><strong>respecter les personnes</strong> : ni propos haineux, discriminatoires, violents ou à caractère sexuel, ni photo ou information sur quelqu'un sans son accord ;</li>
			<li>ne <strong>pas être publié en double</strong> : le site refuse les fiches identiques ;</li>
			<li>vous appartenir : utilisez vos propres photos et textes.</li>
		</ul>
		<p>
			Les publications sont relues par l'équipe, qui peut les refuser, les corriger (fautes, coordonnées publiées par erreur) ou les retirer
			sans préavis si elles ne respectent pas ces règles. Pour protéger votre vie privée, vos coordonnées ne sont jamais affichées
			publiquement : les personnes intéressées passent par le site.
		</p>

		<h2>4. Ensemble contre les arnaques</h2>
		<div class="not-prose my-4 flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px]">
			<ShieldAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
			<ul class="space-y-1.5">
				<li><strong>Aucun employeur ne doit vous demander d'argent</strong> pour un emploi, un stage ou un « dossier ».</li>
				<li><strong>{p.nom_site} ne vous demandera jamais</strong> votre code secret Mobile Money, votre code PIN ou votre mot de passe.</li>
				<li>Ne payez jamais d'avance une personne que vous ne connaissez pas, et méfiez-vous des gains « garantis ».</li>
				<li>Les seuls paiements dus à {p.nom_site} se font depuis le site, et donnent lieu à un reçu.</li>
			</ul>
		</div>
		<p>
			Un doute, une annonce suspecte ? <a href={signaler}>Signalez-le-nous</a> : nous vérifions, retirons les contenus frauduleux et pouvons
			fermer le compte concerné. Toute tentative d'escroquerie peut être signalée aux autorités.
		</p>

		<h2>5. Argent : ce que {p.nom_site} fait et ne fait pas</h2>
		<ul>
			<li>
				{p.nom_site} <strong>n'est ni une banque, ni un établissement de paiement, ni une institution de microfinance</strong>. Elle ne reçoit pas de
				dépôts, ne rémunère pas l'épargne et n'accorde pas de crédit.
			</li>
			<li>
				Dans une Likelemba, un appel de fonds ou l'épargne solidaire, les sommes sont des <strong>engagements entre membres</strong>.
				{p.nom_site} les organise, les enregistre et délivre les reçus ; elle ne détient pas ces fonds pour le compte des membres et ne garantit
				ni les promesses d'apport, ni les remboursements, ni les tours de Likelemba.
				<ACompleter quoi="modalités exactes de circulation des fonds, à valider par un juriste (ADR-0009)" />
			</li>
			<li>
				Les produits et services payants de {p.nom_site} (boutique, accompagnements, statut Master) sont réglés en espèces, par Charden Farell ou
				Mobile Money ; chaque paiement déclaré est vérifié par l'équipe avant confirmation. Politique d'annulation et de remboursement :
				<ACompleter quoi="conditions d'annulation et de remboursement" />.
			</li>
		</ul>

		<h2>6. Conseils et informations</h2>
		<p>
			Les conseils, fiches et informations du site sont donnés de bonne foi, à titre indicatif. Ils ne remplacent ni l'avis d'un
			professionnel (juriste, comptable, banquier, professionnel de santé), ni votre propre vérification avant de vous engager.
		</p>

		<h2>7. Publicités</h2>
		<p>Les publicités sont signalées comme telles. Les annonceurs sont seuls responsables de leurs offres ; {p.nom_site} peut refuser ou retirer une publicité.</p>

		<h2>8. Responsabilité</h2>
		<p>
			{p.nom_site} fait de son mieux pour que le site soit disponible et fiable, sans pouvoir le garantir en permanence. Chaque membre est
			responsable de ce qu'il publie et des engagements qu'il prend avec d'autres membres.
		</p>

		<h2>9. Données personnelles</h2>
		<p>Voir notre <a href="/confidentialite">politique de confidentialité</a>.</p>

		<h2>10. Modifications et droit applicable</h2>
		<p>
			Ces conditions peuvent évoluer ; la version en vigueur est celle publiée sur cette page. Elles sont soumises au droit de la République
			du Congo. En cas de désaccord, écrivez-nous d'abord : nous cherchons toujours une solution à l'amiable.
			<a href="/contact">Nous contacter</a>.
		</p>
	</div>
</article>
