<script lang="ts">
	/** Fiche complète d'un membre (F-ADM-10 à F-ADM-15) et son journal de connexions. */
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import PanneauAcces from '$lib/components/gestion/PanneauAcces.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import { date, dateCourte, dateHeure, fcfa, libelle, lienTel, lienWhatsApp, relatif, telephone } from '$lib/format';

	let { data, form } = $props();
	const m = $derived(data.membre);
	const e = $derived(data.enums);
	const peutAgir = $derived(data.gestionnaire.droit_activation && m.peut_modifier && !m.est_moi);
	const physique = $derived(m.categorie === 1);

	const infos = $derived(
		[
			['Code membre', m.code_membre],
			['Identifiant', m.identifiant],
			['Personnalité', libelle(e, 'CategorieMembre', m.categorie)],
			physique ? ['Sexe', m.sexe === 3 ? '' : libelle(e, 'Sexe', m.sexe)] : ['Forme juridique', libelle(e, 'FormeJuridique', m.forme_juridique)],
			physique ? ['Situation matrimoniale', libelle(e, 'EtatCivil', m.situation_matrimoniale)] : ['Banque / boutique', libelle(e, 'BanqueBoutique', m.type_partenaire)],
			physique ? ['Enfants', String(m.nombre_enfants)] : ["Domaine d'activité", m.domaine_libelle ?? ''],
			physique ? ['Employeur', m.employeur] : ['', ''],
			[physique ? "Pièce d'identité" : 'RCCM / identification', m.numero_piece_identite],
			['Ville', m.ville?.nom ?? ''],
			['Adresse', m.adresse],
			['Inscrit le', date(m.date_creation)],
			['Dernière connexion', m.derniere_connexion ? dateHeure(m.derniere_connexion) : 'Jamais'],
			...(m.type_compte === 2 ? [['Date limite Master', date(m.date_limite_master)]] : [])
		].filter(([k]) => k) as [string, string][]
	);
</script>

<svelte:head>
	<title>{m.nom} — Membres — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre={m.nom} fil={[{ href: '/gestion/membres', label: 'Membres' }, { href: `/gestion/membres/${m.id}`, label: m.pseudonyme || m.nom }]}>
	{#if m.peut_modifier}<Bouton href="/gestion/membres/{m.id}/modifier" variante="secondaire" taille="sm"><Pencil class="size-4" aria-hidden="true" />Modifier la fiche</Bouton>{/if}
	{#snippet bas()}
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<Badge ton={m.type_compte === 1 ? 'laterite' : m.type_compte === 2 ? 'soleil' : 'neutre'}>{libelle(e, 'TypeMembre', m.type_compte)}</Badge>
			<BadgeEtat etat={m.etat} libelles={{ 1: 'À valider', 2: 'Validé', 3: 'Supprimé' }} />
			{#if m.en_ligne}<Badge ton="foret">En ligne</Badge>{/if}
			<span class="text-sm text-ardoise">Pseudonyme public : <strong>{m.pseudonyme}</strong></span>
		</div>
	{/snippet}
</EnTeteGestion>

<div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Modification effectuée." />{/if}
		{#if form?.cle === 'etat'}
			{#if form.succes}<Alerte type="succes" titre={form.succes} />{:else if form.message}<Alerte type="erreur" titre={form.message} />{/if}
		{/if}

		<section class="carte p-5" aria-labelledby="titre-identite">
			<div class="flex flex-wrap items-start gap-4">
				<Avatar src={m.photo_url} nom={m.pseudonyme || m.nom} taille="lg" />
				<div class="min-w-0 flex-1 space-y-2">
					<h2 id="titre-identite" class="text-lg font-bold">Coordonnées</h2>
					<div class="flex flex-wrap gap-2">
						{#if m.telephone}
							<Bouton href={lienTel(m.telephone)} variante="secondaire" taille="sm"><Phone class="size-4" aria-hidden="true" />{telephone(m.telephone)}</Bouton>
							<Bouton href={lienWhatsApp(m.telephone, `Bonjour ${m.pseudonyme}, c'est la frangine.`)} variante="whatsapp" taille="sm" target="_blank" rel="noopener">
								<MessageCircle class="size-4" aria-hidden="true" />WhatsApp
							</Bouton>
						{/if}
						{#if m.email}<Bouton href="mailto:{m.email}" variante="secondaire" taille="sm"><Mail class="size-4" aria-hidden="true" />{m.email}</Bouton>{/if}
						{#if m.type_compte !== 1}
							<!-- La messagerie relie un membre à la frangine : pas de fil pour un gestionnaire -->
							<Bouton href="/gestion/messages/{m.id}" variante="fantome" taille="sm">Messagerie</Bouton>
						{/if}
					</div>
				</div>
			</div>
			<dl class="mt-5 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2 xl:grid-cols-3">
				{#each infos as [k, v] (k)}
					<div><dt class="text-sm text-ardoise">{k}</dt><dd class="font-semibold break-words">{v || '—'}</dd></div>
				{/each}
			</dl>
			{#if m.observation}
				<div class="mt-5 rounded-xl bg-creme p-4">
					<p class="text-sm font-semibold text-ardoise">Observation</p>
					<p class="mt-1 whitespace-pre-line">{m.observation}</p>
				</div>
			{/if}
		</section>

		<section class="carte p-5" aria-labelledby="titre-connexions">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="titre-connexions" class="text-lg font-bold">Connexions ({m.nombre_connexions})</h2>
				{#if m.nombre_connexions}<a href="/gestion/journaux?journal=connexions&membre_id={m.id}" class="lien text-sm">Tout le journal</a>{/if}
			</div>
			{#if data.connexions.items.length}
				<ul class="mt-3 divide-y divide-fleuve-900/5 text-[15px]">
					{#each data.connexions.items as c (c.id)}
						<li class="flex justify-between gap-3 py-2"><span>{dateHeure(c.date_connexion)}</span><span class="font-mono text-sm text-ardoise">{c.adresse_ip || '—'}</span></li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-ardoise">Ce membre ne s'est jamais connecté.</p>
			{/if}
		</section>

		<section class="carte p-5" aria-labelledby="titre-paiements">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="titre-paiements" class="text-lg font-bold">Paiements ({m.nombre_paiements})</h2>
				{#if data.paiements && m.nombre_paiements}<a href="/gestion/paiements?membre_id={m.id}" class="lien text-sm">Tous ses paiements</a>{/if}
			</div>
			{#if m.paiements_en_attente}<p class="mt-2 font-semibold text-laterite-700">{m.paiements_en_attente} paiement(s) à confirmer.</p>{/if}
			{#if data.paiements?.items.length}
				<ul class="mt-3 divide-y divide-fleuve-900/5 text-[15px]">
					{#each data.paiements.items as p (p.id)}
						<li class="flex flex-wrap justify-between gap-2 py-2">
							<span>{dateCourte(p.date_paiement)} · {libelle(e, 'TypeObjetPaye', p.type_objet)} · {libelle(e, 'ModePaiement', p.mode)}</span>
							<span class="montant font-semibold">{fcfa(p.montant)} <span class="font-normal text-ardoise">· {libelle(e, 'EtatPaiement', p.etat)}</span></span>
						</li>
					{/each}
				</ul>
			{:else if !data.paiements && m.nombre_paiements}
				<p class="mt-2 text-sm text-ardoise">Le détail des paiements est réservé au droit Caisse.</p>
			{/if}
		</section>
	</div>

	<aside class="space-y-6" aria-label="Actions sur le compte">
		{#if peutAgir}
			<section class="carte space-y-3 p-5" aria-labelledby="titre-etat">
				<h2 id="titre-etat" class="text-lg font-bold">Validation</h2>
				{#if m.etat === 1}
					<p class="text-[15px] text-ardoise">Inscrit {relatif(m.date_creation)}, pas encore validé. Le membre recevra un message de bienvenue.</p>
				{/if}
				<div class="flex flex-wrap gap-2">
					{#if m.etat !== 2}
						<Formulaire action="?/etat">
							{#snippet children({ envoi })}
								<input type="hidden" name="etat" value="2" />
								<Bouton type="submit" variante="fleuve" taille="sm" chargement={envoi}>
									{#if m.etat === 3}<RotateCcw class="size-4" aria-hidden="true" />Réactiver{:else}<Check class="size-4" aria-hidden="true" />Valider le membre{/if}
								</Bouton>
							{/snippet}
						</Formulaire>
					{/if}
					{#if m.etat === 2}
						<Formulaire action="?/etat">
							{#snippet children({ envoi })}
								<input type="hidden" name="etat" value="1" />
								<Bouton type="submit" variante="secondaire" taille="sm" chargement={envoi}>Remettre « à valider »</Bouton>
							{/snippet}
						</Formulaire>
					{/if}
					{#if m.etat !== 3}
						<Formulaire action="?/etat" confirmer="Supprimer ce compte ? Il ne pourra plus se connecter (ses données sont conservées).">
							{#snippet children({ envoi })}
								<input type="hidden" name="etat" value="3" />
								<Bouton type="submit" variante="danger" taille="sm" chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Supprimer</Bouton>
							{/snippet}
						</Formulaire>
					{/if}
				</div>
			</section>
		{/if}

		<PanneauAcces {m} {form} activation={data.gestionnaire.droit_activation} />

		{#if peutAgir}
			<section class="carte p-5" aria-labelledby="titre-photo">
				<h2 id="titre-photo" class="mb-3 text-lg font-bold">Photo</h2>
				<Formulaire action="?/photo" {form} cle="photo" fichiers>
					{#snippet children({ envoi })}
						<Fichier label="Photo du profil" name="photo" actuel={m.photo_url} erreur={form?.cle === 'photo' ? form?.champs?.photo : undefined} />
						<Bouton type="submit" variante="secondaire" taille="sm" class="mt-3" chargement={envoi}>Enregistrer la photo</Bouton>
					{/snippet}
				</Formulaire>
			</section>
		{/if}
	</aside>
</div>
