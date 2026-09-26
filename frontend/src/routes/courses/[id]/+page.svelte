<script lang="ts">
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Phone from '@lucide/svelte/icons/phone';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import BadgeEtatCourse from '$lib/components/courses/BadgeEtatCourse.svelte';
	import EtapesCourse from '$lib/components/courses/EtapesCourse.svelte';
	import { dateCourte, dateHeure, fcfa, libelle, lienTel, lienWhatsApp, telephone } from '$lib/format';

	let { data, form } = $props();
	const c = $derived(data.course);
	const payee = $derived(c.paye === 1);
	const libellesEtat: Record<number, string> = { 1: 'En attente', 2: 'Annulée', 3: 'Achats effectués', 4: 'Livrée' };
	const suivi = $derived(form?.cle === 'suivi' ? form : null);
	const wa = $derived(data.parametres.whatsapp);
</script>

<svelte:head>
	<title>Course {c.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage titre="Course {c.reference}" surtitre="Courses & livraison" fil={[{ href: '/courses', label: 'Courses & livraison' }]}>
	<BadgeEtatCourse etat={c.etat_course} />
	<Badge ton={payee ? 'foret' : 'neutre'}>{payee ? 'Payée' : 'À payer'}</Badge>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="min-w-0 space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre="Votre course est bien enregistrée.">Référence {c.reference}. Réglez-la pour que nous lancions les achats.</Alerte>
		{/if}
		{#if data.paye}
			<Alerte type="succes" titre="Paiement enregistré, merci !">Notre caisse le vérifie ; vous êtes prévenu·e à chaque étape.</Alerte>
		{/if}

		<section class="carte p-5"><EtapesCourse etat={c.etat_course} {payee} /></section>

		<section class="carte p-6">
			<h2 class="text-xl font-bold">Articles à acheter</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-left text-[15px]">
					<thead class="text-sm text-ardoise">
						<tr><th class="py-1 pr-2 font-semibold">Article</th><th class="px-2 py-1 text-right font-semibold">Prix maxi</th><th class="px-2 py-1 text-right font-semibold">Qté</th><th class="py-1 pl-2 text-right font-semibold">Montant</th></tr>
					</thead>
					<tbody class="divide-y divide-fleuve-900/5">
						{#each c.lignes as l, i (l.id ?? i)}
							<tr>
								<td class="py-2 pr-2">
									{l.nom_article}
									{#if l.article_catalogue_id}<Badge ton="fleuve" class="ml-1">Catalogue</Badge>{/if}
									{#if l.observation}<span class="block text-sm text-ardoise">{l.observation}</span>{/if}
								</td>
								<td class="montant px-2 py-2 text-right">{fcfa(l.prix_plafond)}</td>
								<td class="px-2 py-2 text-right">{l.quantite}</td>
								<td class="montant py-2 pl-2 text-right font-semibold">{fcfa(l.montant)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<dl class="mt-4 space-y-1 border-t border-fleuve-900/5 pt-3 text-[15px]">
				<div class="flex justify-between"><dt>Montant des courses</dt><dd class="montant font-semibold">{fcfa(c.montant_achats)}</dd></div>
				<div class="flex justify-between"><dt>Frais de course</dt><dd class="montant font-semibold">{fcfa(c.frais_service)}</dd></div>
				<div class="flex items-baseline justify-between"><dt class="font-bold">Net à payer</dt><dd class="montant font-display text-2xl font-extrabold text-laterite-700">{fcfa(c.net_a_payer)}</dd></div>
			</dl>
		</section>

		<section class="carte p-6">
			<h2 class="text-xl font-bold">Achats et livraison</h2>
			<dl class="mt-3 grid gap-4 text-[15px] sm:grid-cols-2">
				<div><dt class="text-ardoise">Lieu d'achat</dt><dd class="font-semibold whitespace-pre-line">{c.lieu_achat}</dd></div>
				<div><dt class="text-ardoise">Date des achats</dt><dd class="font-semibold">{dateCourte(c.date_achat)}</dd></div>
				<div><dt class="text-ardoise">Lieu de livraison</dt><dd class="font-semibold whitespace-pre-line">{c.lieu_livraison}</dd></div>
				<div><dt class="text-ardoise">Livraison prévue</dt><dd class="font-semibold">{dateHeure(c.date_livraison)}</dd></div>
				{#if c.boutique}<div><dt class="text-ardoise">Boutique</dt><dd class="font-semibold">{c.boutique.pseudonyme}</dd></div>{/if}
				<div><dt class="text-ardoise">Commandée le</dt><dd class="font-semibold">{dateHeure(c.date_creation)}{#if c.client && !c.est_client} par {c.client.pseudonyme}{/if}</dd></div>
				{#if c.observation}<div class="sm:col-span-2"><dt class="text-ardoise">Observation</dt><dd class="whitespace-pre-line">{c.observation}</dd></div>{/if}
			</dl>
		</section>

		{#if c.contact_client}
			<section class="carte p-5">
				<h2 class="text-lg font-bold">Client</h2>
				<p class="mt-1 font-semibold">{c.contact_client.pseudonyme} <span class="font-normal text-ardoise">· {c.contact_client.nom}</span></p>
				{#if c.contact_client.telephone}
					<p class="mt-2 flex flex-wrap gap-4 text-[15px]">
						<a href={lienTel(c.contact_client.telephone)} class="lien inline-flex items-center gap-1"><Phone class="size-4" aria-hidden="true" />{telephone(c.contact_client.telephone)}</a>
						<a href={lienWhatsApp(c.contact_client.telephone, `Bonjour, c'est au sujet de votre course ${c.reference}.`)} target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-semibold text-foret-700"><MessageCircle class="size-4" aria-hidden="true" />WhatsApp</a>
					</p>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		<section class="carte space-y-3 p-5" aria-labelledby="titre-paiement">
			<h2 id="titre-paiement" class="text-lg font-bold">Paiement</h2>
			{#if c.paiement}
				<p class="text-[15px]">
					{fcfa(c.paiement.montant)} déclaré le {dateHeure(c.paiement.date_paiement)} ({libelle(data.enums, 'ModePaiement', c.paiement.mode)}).
				</p>
				<Badge ton={c.paiement.etat === 3 ? 'foret' : 'soleil'}>{libelle(data.enums, 'EtatPaiement', c.paiement.etat)}</Badge>
			{:else if c.peut_payer}
				<p class="text-[15px] text-ardoise">Réglez les achats et les frais pour lancer votre course.</p>
				<Bouton href="/paiement/4?objet={c.id}" pleineLargeur taille="lg">Payer {fcfa(c.net_a_payer)}</Bouton>
			{:else}
				<p class="text-[15px] text-ardoise">{c.etat_course === 2 ? 'Course annulée : aucun paiement attendu.' : 'Aucun paiement déclaré pour le moment.'}</p>
			{/if}
		</section>

		{#if c.peut_modifier || c.peut_annuler || c.peut_gerer}
			<section class="carte space-y-3 p-5" aria-label="Gérer la course">
				<h2 class="text-lg font-bold">Gérer la course</h2>
				{#if suivi?.succes}<Alerte type="succes" titre={suivi.succes} />{:else if suivi?.message}<Alerte type="erreur" titre={suivi.message} />{/if}
				{#if c.peut_modifier}
					<Bouton href="/courses/{c.id}/modifier" variante="secondaire" pleineLargeur><Pencil class="size-4" aria-hidden="true" />Modifier la commande</Bouton>
				{/if}
				{#if c.peut_gerer}
					<Formulaire action="?/etatCourse">
						{#snippet children({ envoi })}
							<label for="etat-course" class="mb-1.5 block text-[15px] font-semibold">État de la course</label>
							<div class="flex gap-2">
								<select id="etat-course" name="etat_course" class="flex-1">
									{#each c.etats_possibles as e (e)}<option value={e} selected={e === c.etat_course}>{libellesEtat[e]}</option>{/each}
								</select>
								<Bouton type="submit" variante="fleuve" chargement={envoi}>OK</Bouton>
							</div>
							<p class="mt-1 text-sm text-ardoise">Le client est prévenu à chaque changement.</p>
						{/snippet}
					</Formulaire>
				{:else if c.peut_annuler}
					<Formulaire action="?/etatCourse" confirmer="Annuler définitivement cette course ?">
						{#snippet children({ envoi })}
							<input type="hidden" name="etat_course" value="2" />
							<Bouton type="submit" variante="danger" pleineLargeur chargement={envoi}>Annuler ma course</Bouton>
						{/snippet}
					</Formulaire>
				{/if}
			</section>
		{/if}

		<PanneauModeration etat={c.etat} peutModerer={c.peut_moderer} peutModifier={c.peut_moderer} {form} />

		{#if wa}
			<a
				href={lienWhatsApp(wa, `Bonjour la Frangine, j'ai une question sur ma course ${c.reference}.`)}
				target="_blank"
				rel="noopener"
				class="flex min-h-12 items-center justify-center gap-2 rounded-xl font-semibold text-foret-700 ring-1 ring-foret-600/40 ring-inset hover:bg-foret-50"
			>
				<MessageCircle class="size-5" aria-hidden="true" />Une question ? Écrire à la frangine
			</a>
		{/if}
	</aside>
</div>
