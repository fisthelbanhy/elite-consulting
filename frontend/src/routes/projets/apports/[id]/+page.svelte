<script lang="ts">
	import Receipt from '@lucide/svelte/icons/receipt';
	import Clock from '@lucide/svelte/icons/clock';
	import Wallet from '@lucide/svelte/icons/wallet';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import GestionApport from '$lib/components/projets/GestionApport.svelte';
	import AvertissementProjets from '$lib/components/projets/AvertissementProjets.svelte';
	import { dateCourte, fcfa, libelle, telephone } from '$lib/format';
	import { ETATS_APPORT } from '$lib/types/projets';

	let { data, form } = $props();
	const a = $derived(data.apport);
	const tons = { 1: 'soleil', 2: 'foret', 3: 'alerte', 4: 'neutre' } as const;
</script>

<svelte:head>
	<title>Apport {a.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Apport {a.reference}"
	sousTitre="Au projet « {a.appel_fond.nom_projet} » ({a.appel_fond.reference})"
	surtitre="Appels de fonds"
	fil={[{ href: '/projets/apports', label: 'Apports' }, { href: `/projets/${a.appel_fond.id}`, label: a.appel_fond.reference }]}
>
	<Bouton href="/projets/{a.appel_fond.id}" variante="secondaire">Voir le projet</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.paye}
			<Alerte type="succes" titre="Versement déclaré.">
				Notre caisse va le vérifier : il sera compté dans le montant collecté dès sa confirmation.
			</Alerte>
		{/if}

		<section class="carte space-y-5 p-6" aria-labelledby="titre-suivi">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="titre-suivi" class="text-xl font-bold">Suivi de l'apport</h2>
				<div class="flex gap-2">
					<Badge ton={tons[a.etat as 1 | 2 | 3 | 4] ?? 'neutre'}>{ETATS_APPORT[a.etat]}</Badge>
					<Badge>{libelle(data.enums, 'TypeApportFond', a.type_apport)}</Badge>
				</div>
			</div>
			<div class="space-y-2">
				<p>
					<span class="montant font-display text-3xl font-extrabold text-foret-700">{fcfa(a.montant_verse)}</span>
					<span class="text-ardoise">versés sur {fcfa(a.montant_promis)} promis</span>
				</p>
				<Jauge valeur={a.montant_verse} max={a.montant_promis} label="Part versée de l'apport" />
			</div>
			<dl class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Reste à verser</dt><dd class="montant text-lg font-bold">{fcfa(a.reste_a_verser)}</dd></div>
				<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Promis le</dt><dd class="text-lg font-bold">{dateCourte(a.date_engagement)}</dd></div>
				<div class="rounded-xl bg-creme p-3"><dt class="text-sm text-ardoise">Échéance</dt><dd class="text-lg font-bold">{a.echeance_mois ? `${a.echeance_mois} mois` : 'Aucune'}</dd></div>
			</dl>
			{#if a.en_attente}
				<p class="flex items-center gap-2 rounded-xl bg-soleil-100 p-3 text-[15px]">
					<Clock class="size-5 shrink-0" aria-hidden="true" />
					<span><strong class="montant">{fcfa(a.en_attente)}</strong> déclarés, en attente de confirmation par la caisse.</span>
				</p>
			{/if}
			{#if a.remarque}
				<div><h3 class="text-base font-bold">Remarque du créancier</h3><p class="mt-1 text-[15px] whitespace-pre-line">{a.remarque}</p></div>
			{/if}
			{#if a.observation_mediateur}
				<div><h3 class="text-base font-bold">Observation de la frangine</h3><p class="mt-1 text-[15px] whitespace-pre-line">{a.observation_mediateur}</p></div>
			{/if}
		</section>

		<section class="carte p-6" aria-labelledby="titre-versements">
			<h2 id="titre-versements" class="flex items-center gap-2 text-xl font-bold"><Receipt class="size-5" aria-hidden="true" />Versements reçus</h2>
			{#if a.versements.length}
				<table class="mt-4 w-full text-[15px]">
					<thead>
						<tr class="border-b border-fleuve-900/10 text-left text-sm text-ardoise"><th scope="col" class="py-2 font-semibold">Date</th><th scope="col" class="py-2 text-right font-semibold">Montant</th></tr>
					</thead>
					<tbody>
						{#each a.versements as v (v.id)}
							<tr class="border-b border-fleuve-900/5"><td class="py-2">{dateCourte(v.date_versement)}</td><td class="montant py-2 text-right font-semibold">{fcfa(v.montant)}</td></tr>
						{/each}
					</tbody>
					<tfoot>
						<tr><th scope="row" class="py-2 text-left">Total</th><td class="montant py-2 text-right font-bold text-foret-700">{fcfa(a.montant_verse)}</td></tr>
					</tfoot>
				</table>
			{:else}
				<p class="mt-2 text-ardoise">Aucun versement confirmé pour l'instant.</p>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		{#if a.est_creancier}
			<section class="carte space-y-3 p-5" aria-labelledby="titre-verser">
				<h2 id="titre-verser" class="flex items-center gap-2 text-lg font-bold"><Wallet class="size-5 text-laterite-600" aria-hidden="true" />Verser</h2>
				{#if a.peut_declarer}
					<p class="text-[15px] text-ardoise">
						Payez par Mobile Money, espèces ou Charden Farell, puis déclarez le montant : notre caisse le confirme et vous délivre une
						référence.
					</p>
					<Bouton href="/paiement/8?objet={a.id}" pleineLargeur>Déclarer un versement</Bouton>
				{:else if a.etat === 3}
					<p class="text-[15px] text-ardoise">Cet apport est annulé.</p>
				{:else}
					<p class="text-[15px] text-ardoise">Merci : votre apport est entièrement versé ou déclaré.</p>
				{/if}
			</section>
		{/if}

		{#if a.creancier}
			<section class="carte space-y-2 p-5" aria-labelledby="titre-creancier">
				<h2 id="titre-creancier" class="text-lg font-bold">Créancier</h2>
				<p class="font-semibold">{a.creancier.pseudonyme} <span class="font-normal text-ardoise">· {a.creancier.nom}</span></p>
				{#if a.creancier.telephone}<p>{telephone(a.creancier.telephone)}</p>{/if}
				{#if a.creancier.email}<p>{a.creancier.email}</p>{/if}
			</section>
		{/if}

		{#if a.peut_gerer}<GestionApport apport={a} {form} />{/if}

		<AvertissementProjets class="text-sm" />
	</aside>
</div>
