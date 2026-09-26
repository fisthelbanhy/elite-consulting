<script lang="ts">
	import Wallet from '@lucide/svelte/icons/wallet';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import OngletsEpargne from '$lib/components/epargne/OngletsEpargne.svelte';
	import AvertissementEpargne from '$lib/components/epargne/AvertissementEpargne.svelte';
	import { champ } from '$lib/forms';
	import { date, dateHeure, fcfa, libelle } from '$lib/format';

	let { data, form } = $props();
	const x = $derived(data.fond);
	const placement = $derived(x.type_fond === 2);
</script>

<svelte:head>
	<title>{placement ? 'Placement' : 'Don'} {x.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="{placement ? 'Placement' : 'Don'} {x.reference}"
	sousTitre={x.souscripteur_nom ? `Au nom de ${x.souscripteur_nom}` : undefined}
	surtitre="Épargne solidaire"
	fil={[{ href: '/epargne', label: 'Épargne solidaire' }, { href: '/epargne/dons-placements', label: 'Dons & placements' }]}
>
	{#snippet bas()}<OngletsEpargne actif="dons" />{/snippet}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Souscription enregistrée sous la référence {x.reference}.">Il ne reste plus qu'à la payer.</Alerte>{/if}
		{#if data.paye}<Alerte type="succes" titre="Paiement déclaré.">Notre caisse le vérifie et le confirme ; vous recevrez un message.</Alerte>{/if}

		<section class="carte space-y-5 p-6" aria-labelledby="titre-souscription">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="titre-souscription" class="text-xl font-bold">Souscription</h2>
				<Badge ton={placement ? 'fleuve' : 'laterite'}>{placement ? 'Placement' : 'Don'}</Badge>
			</div>
			<p class="montant font-display text-4xl font-extrabold text-fleuve-800">{fcfa(x.montant)}</p>
			<dl class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Date</dt><dd class="font-semibold">{date(x.date_souscription)}</dd></div>
				{#if placement}<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Durée</dt><dd class="font-semibold">{x.duree_mois} mois</dd></div>{/if}
				<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Souscripteur</dt><dd class="font-semibold">{x.souscripteur_nom}</dd></div>
				<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Rapporteur</dt><dd class="font-semibold">{x.rapporteur_nom || 'Non renseigné'}</dd></div>
			</dl>
			{#if x.motivation}<div><h3 class="text-base font-bold">Motivation</h3><p class="mt-1 whitespace-pre-line">{x.motivation}</p></div>{/if}
		</section>

		{#if x.peut_modifier}
			<section class="carte p-6" aria-labelledby="titre-modifier">
				<h2 id="titre-modifier" class="mb-4 text-xl font-bold">Modifier la souscription</h2>
				<Formulaire action="?/modifier" {form} cle="modifier">
					{#snippet children({ envoi })}
						<div class="space-y-4">
							<div class="grid gap-4 sm:grid-cols-2">
								<Saisie label="Montant" type="number" inputmode="numeric" min="0" suffixe="FCFA" disabled={x.confirme === 1} aide={x.confirme === 1 ? 'Montant figé : la souscription est payée.' : undefined} {...champ(form, 'montant', x.montant, 'modifier')} />
								{#if placement}<Saisie label="Durée (mois)" type="number" inputmode="numeric" min="12" max="120" {...champ(form, 'duree_mois', x.duree_mois, 'modifier')} />{/if}
							</div>
							{#if x.confirme === 1}<input type="hidden" name="montant" value={x.montant} />{/if}
							{#if !placement}<input type="hidden" name="duree_mois" value="0" />{/if}
							<Zone label="Motivation" lignes={3} {...champ(form, 'motivation', x.motivation, 'modifier')} />
							<Bouton type="submit" variante="fleuve" chargement={envoi}>Enregistrer</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		<section class="carte space-y-4 p-5" aria-labelledby="titre-paiement">
			<h2 id="titre-paiement" class="text-lg font-bold">Paiement</h2>
			{#if x.confirme === 1}
				{#if x.etat_paiement === 3}
					<p class="flex items-center gap-2 font-semibold text-foret-700"><CircleCheck class="size-5" aria-hidden="true" />Paiement confirmé</p>
				{:else}
					<p class="flex items-center gap-2 font-semibold"><Clock class="size-5 text-soleil-400" aria-hidden="true" />Paiement déclaré, en cours de vérification</p>
				{/if}
				<p class="text-sm text-ardoise">
					{libelle(data.enums, 'ModePaiement', x.mode_paiement)}{#if x.date_paiement} · le {dateHeure(x.date_paiement)}{/if}
				</p>
			{:else if x.peut_payer}
				<p class="text-[15px] text-ardoise">Payez par Mobile Money, espèces ou Charden Farell : le montant est déjà rempli.</p>
				<Bouton href="/paiement/7?objet={x.id}" pleineLargeur taille="lg"><Wallet class="size-5" aria-hidden="true" />Payer {fcfa(x.montant)}</Bouton>
			{:else}
				<p class="text-[15px] text-ardoise">Cette souscription n'est pas payable pour le moment.</p>
			{/if}
		</section>

		<AvertissementEpargne />

		<PanneauModeration etat={x.etat} peutModerer={x.peut_moderer} {form} />
	</aside>
</div>
