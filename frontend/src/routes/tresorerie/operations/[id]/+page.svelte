<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import Save from '@lucide/svelte/icons/save';
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import LigneOperation from '$lib/components/tresorerie/LigneOperation.svelte';
	import PanneauFiche from '$lib/components/tresorerie/PanneauFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { date, dateCourte, dateHeure, entier, libelle } from '$lib/format';

	let { data, form } = $props();
	const o = $derived(data.fiche);
	const edition = $derived(data.modifier && o.peut_modifier);
	const devise = (d: number) => libelle(data.enums, 'Devise', d) || 'FCFA';
	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	const retourFiche = $derived((form as Retour)?.cle === 'fiche' ? (form as Retour) : null);
	const details = $derived<[string, string][]>([
		['Type d’opération', libelle(data.enums, 'TypeOperationBanque', o.type_operation)],
		['Montant', `${entier(o.montant)} ${devise(o.devise)}`],
		['Date de l’opération', date(o.date_operation)],
		['Saisie le', dateHeure(o.date_saisie)],
		['Banque émettrice', o.nom_banque_emettrice],
		['E-mail de la banque émettrice', o.banque_emettrice_email || '—'],
		['Bénéficiaire', o.beneficiaire],
		['Banque du bénéficiaire', o.nom_banque_beneficiaire || '—'],
		['Adresse de la banque du bénéficiaire', o.banque_beneficiaire_adresse || '—'],
		...(o.membre && data.membre?.est_gestionnaire ? ([['Membre', o.membre.pseudonyme]] as [string, string][]) : [])
	]);
</script>

<svelte:head>
	<title>Opération {o.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Opération {o.reference}" fil={[{ href: '/tresorerie/operations', label: 'Opérations bancaires' }]} />

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}
			<Alerte type="succes" titre={data.lot > 1 ? `${data.lot} opérations enregistrées sous la référence ${o.reference}.` : 'Enregistrement effectué.'}>
				{data.emails ? 'L’ordre a été transmis par e-mail à votre banque.' : 'Aucune adresse e-mail de banque : pensez à transmettre l’ordre à votre banque.'}
			</Alerte>
		{/if}
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}

		{#if edition}
			<Formulaire action="?/modifier" form={retourFiche} cle="fiche">
				{#snippet children({ envoi })}
					<div class="carte space-y-6 p-5 sm:p-6">
						<LigneOperation form={retourFiche} banques={data.banques} initial={o} />
						<div class="flex flex-wrap gap-3">
							<Bouton type="submit" chargement={envoi}><Save class="size-5" aria-hidden="true" />Enregistrer</Bouton>
							<Bouton href="/tresorerie/operations/{o.id}" variante="fantome">Annuler</Bouton>
						</div>
					</div>
				{/snippet}
			</Formulaire>
		{:else}
			<section class="carte p-6">
				<dl class="grid gap-x-8 gap-y-3 sm:grid-cols-2">
					{#each details as [l, v] (l)}<div class="min-w-0"><dt class="text-sm text-ardoise">{l}</dt><dd class="font-semibold break-words">{v}</dd></div>{/each}
				</dl>
			</section>
		{/if}

		{#if o.lot.length}
			<section class="carte p-6">
				<h2 class="text-lg font-bold">Autres opérations du même ordre ({o.reference})</h2>
				<ul class="mt-3 divide-y divide-fleuve-900/5">
					{#each o.lot as l (l.id)}
						<li>
							<a href="/tresorerie/operations/{l.id}" class="flex justify-between gap-3 py-3 hover:bg-creme">
								<span>{libelle(data.enums, 'TypeOperationBanque', l.type_operation)} · {l.beneficiaire} <span class="text-sm text-ardoise">· {dateCourte(l.date_operation)}</span></span>
								<span class="montant font-semibold">{entier(l.montant)} {devise(l.devise)}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<FilDialogue dialogue={data.dialogue} {form} sujet="cette opération" />
	</div>

	<div class="space-y-6">
		<PanneauFiche etat={o.etat} peutModerer={o.peut_moderer} peutModifier={o.peut_modifier && !edition} peutAnnuler={o.peut_annuler} lienModifier="?modifier=1" {form} />
		{#if o.etat !== 3}
			<section class="carte space-y-3 p-5">
				<h2 class="flex items-center gap-2 text-lg font-bold"><Mail class="size-5 text-fleuve-600" aria-hidden="true" />Transmettre à la banque</h2>
				{#if o.email_destinataire}
					<p class="text-sm text-ardoise">Renvoyez l’ordre « Programmation opérations bancaires » à la banque émettrice.</p>
					<Formulaire action="?/mail" {form} cle="mail">
						{#snippet children({ envoi })}
							<Bouton type="submit" variante="secondaire" pleineLargeur chargement={envoi}>Envoyer le mail</Bouton>
						{/snippet}
					</Formulaire>
				{:else}
					<p class="text-sm text-ardoise">Aucune adresse e-mail n’est connue pour cette banque. {#if o.peut_modifier}<a href="?modifier=1" class="lien">Ajoutez-la</a> pour transmettre l’ordre.{/if}</p>
				{/if}
			</section>
		{/if}
	</div>
</div>
