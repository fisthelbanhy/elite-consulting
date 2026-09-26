<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import ACompleter from '$lib/components/contact/ACompleter.svelte';

	let { data } = $props();
	const p = $derived(data.parametres);

	const finalites = [
		['Créer et gérer votre compte, vous connecter', 'Exécution du service que vous demandez'],
		['Publier vos annonces, offres, projets et vous mettre en relation', 'Exécution du service'],
		['Vous accompagner : messagerie, diagnostic, dossiers', 'Exécution du service, à votre demande'],
		['Enregistrer vos paiements et vous délivrer des reçus', 'Exécution du service et obligations comptables'],
		['Répondre à vos messages de contact', 'Votre demande'],
		['Protéger le site contre la fraude et les robots', 'Intérêt légitime : sécurité des membres'],
		['Mesurer la fréquentation (nombre de visites, sans publicité ciblée)', 'Intérêt légitime : améliorer le site']
	];

	const durees = [
		['Compte et profil', 'Tant que le compte est actif, puis 3 ans après la dernière connexion'],
		['Annonces et publications', 'Durée de publication, puis 3 ans (archives)'],
		['Messagerie privée', 'Durée de vie du compte'],
		['Messages de contact (visiteurs)', '3 ans après le dernier échange'],
		['Paiements et reçus', '10 ans (conservation des pièces comptables, droit OHADA)'],
		['Journaux de connexion et de visites', '12 mois'],
		['Suggestions', 'Anonymes dès le dépôt : aucune donnée personnelle']
	];
</script>

<svelte:head>
	<title>Confidentialité et données personnelles — {p.nom_site}</title>
	<meta
		name="description"
		content="Comment La Frangine protège vos données personnelles : données collectées, finalités, durées de conservation et vos droits (loi congolaise n° 29-2019)."
	/>
</svelte:head>

<EnTetePage
	titre="Vos données personnelles"
	surtitre="Confidentialité"
	sousTitre="Ce que nous collectons, pourquoi, combien de temps, et comment exercer vos droits. Sans jargon."
	fil={[{ href: '/confidentialite', label: 'Confidentialité' }]}
/>

<article class="conteneur max-w-3xl py-10">
	<div class="prose max-w-none prose-headings:font-display prose-headings:text-fleuve-700 prose-a:text-fleuve-700">
		<p class="lead">
			Dernière mise à jour : 22 septembre 2026. Cette politique applique la <strong>loi n° 29-2019 du 10 octobre 2019 portant protection des
			données à caractère personnel</strong> en République du Congo.
		</p>

		<h2>En bref</h2>
		<ul>
			<li>Nous ne vendons jamais vos données.</li>
			<li>Le public ne voit que votre pseudonyme et ce que vous choisissez de publier ; votre téléphone et votre e-mail restent privés.</li>
			<li>Votre mot de passe est chiffré : personne, pas même l'équipe, ne peut le lire.</li>
			<li>Vous pouvez à tout moment consulter, corriger ou faire supprimer vos données.</li>
		</ul>

		<h2>Responsable du traitement</h2>
		<p>
			Primera-C, éditeur de {p.nom_site}, <ACompleter quoi="raison sociale exacte, RCCM et NIU" />, {p.adresse || 'Brazzaville'}, République du
			Congo.{#if p.email} Contact : <a href="mailto:{p.email}">{p.email}</a>.{/if}
			Déclaration ou autorisation auprès de l'autorité de protection : <ACompleter quoi="numéro de récépissé, le cas échéant" />.
		</p>

		<h2>Les données que nous collectons</h2>
		<ul>
			<li><strong>Votre compte</strong> : nom, pseudonyme, téléphone, ville, et si vous les donnez : e-mail, sexe, situation familiale, pièce d'identité, employeur, photo. Pour une entreprise : raison sociale, sigle, forme juridique, domaine d'activité.</li>
			<li><strong>Ce que vous publiez</strong> : annonces, offres et demandes d'emploi (CV compris), projets, témoignages, questions.</li>
			<li><strong>Vos échanges</strong> : messages à votre frangine, messages de contact, réponses au diagnostic et aux dossiers d'accompagnement.</li>
			<li><strong>Vos paiements</strong> : montant, mode (espèces, Charden Farell, Mobile Money) et référence de transaction. Jamais votre code secret.</li>
			<li><strong>Données techniques</strong> : adresse IP et date des visites et connexions, pour la sécurité et les statistiques.</li>
		</ul>
		<p>
			<strong>Cookies</strong> : un cookie de session (pour rester connecté·e) et un cookie de mesure d'audience de 30 minutes, sans pistage
			publicitaire. Les photos que vous envoyez sont nettoyées de leurs métadonnées (dont la localisation GPS).
		</p>

		<h2>Pourquoi nous les utilisons</h2>
		<div class="not-prose overflow-x-auto">
			<table class="w-full min-w-[32rem] text-left text-[15px]">
				<thead class="bg-creme text-sm text-ardoise">
					<tr><th scope="col" class="px-3 py-2">Finalité</th><th scope="col" class="px-3 py-2">Fondement</th></tr>
				</thead>
				<tbody class="divide-y divide-fleuve-900/5 bg-white">
					{#each finalites as [f, b] (f)}<tr><td class="px-3 py-2">{f}</td><td class="px-3 py-2 text-ardoise">{b}</td></tr>{/each}
				</tbody>
			</table>
		</div>

		<h2>Qui y a accès</h2>
		<ul>
			<li>L'équipe de {p.nom_site}, chacun selon ses droits (conseil, validation des fiches, caisse).</li>
			<li>Les autres membres voient seulement votre pseudonyme et vos publications. Vos coordonnées ne sont transmises qu'avec votre accord, par exemple quand vous vous manifestez sur une annonce.</li>
			<li>Nos prestataires techniques, tenus à la confidentialité : hébergement, envoi d'e-mails <ACompleter quoi="noms des prestataires et des opérateurs de paiement" />.</li>
			<li>Les autorités, uniquement sur demande légale.</li>
		</ul>
		<p>Lieu d'hébergement des données : <ACompleter quoi="pays d'hébergement et garanties en cas de transfert hors du Congo" />.</p>

		<h2>Combien de temps nous les gardons</h2>
		<div class="not-prose overflow-x-auto">
			<table class="w-full min-w-[32rem] text-left text-[15px]">
				<thead class="bg-creme text-sm text-ardoise">
					<tr><th scope="col" class="px-3 py-2">Données</th><th scope="col" class="px-3 py-2">Durée</th></tr>
				</thead>
				<tbody class="divide-y divide-fleuve-900/5 bg-white">
					{#each durees as [d, t] (d)}<tr><td class="px-3 py-2">{d}</td><td class="px-3 py-2 text-ardoise">{t}</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<p><ACompleter quoi="durées de conservation à valider par le responsable du traitement" /></p>

		<h2>Vos droits</h2>
		<p>Conformément à la loi n° 29-2019, vous pouvez à tout moment :</p>
		<ul>
			<li><strong>savoir</strong> quelles données nous avons sur vous et en obtenir une copie ;</li>
			<li><strong>corriger</strong> une information inexacte (la plupart se modifient directement dans votre profil) ;</li>
			<li><strong>vous opposer</strong> à un traitement pour un motif légitime ;</li>
			<li><strong>faire supprimer</strong> vos données et votre compte, sauf ce que la loi nous oblige à garder (pièces comptables).</li>
		</ul>
		<p>
			Pour cela, <a href="/contact?objet={encodeURIComponent('Mes données personnelles')}">écrivez-nous</a>{#if p.email} ou envoyez un e-mail à
				<a href="mailto:{p.email}">{p.email}</a>{/if}. Nous pouvons vous demander de prouver votre identité et nous vous répondons dans un
			délai de <ACompleter quoi="délai de réponse" />. Si notre réponse ne vous satisfait pas, vous pouvez saisir l'autorité de protection des
			données prévue par la loi : <ACompleter quoi="nom et coordonnées de l'autorité compétente" />.
		</p>

		<h2>Sécurité</h2>
		<p>
			Connexion chiffrée (HTTPS), mots de passe chiffrés, accès de l'équipe limité selon les droits de chacun, contrôle des fichiers envoyés,
			limitation des tentatives de connexion. Aucun système n'étant infaillible, nous vous préviendrons en cas d'incident touchant vos
			données.
		</p>

		<h2>Mineurs</h2>
		<p>Le service s'adresse aux personnes majeures. <ACompleter quoi="âge minimum et règles pour les mineurs, à valider" /></p>

		<h2>Modifications</h2>
		<p>Cette politique peut évoluer ; la date de mise à jour figure en haut de page. En cas de changement important, nous vous prévenons dans votre messagerie.</p>
	</div>
</article>
