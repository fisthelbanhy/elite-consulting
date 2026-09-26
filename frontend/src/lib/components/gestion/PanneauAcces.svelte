<script lang="ts">
	/**
	 * Accès d'un membre : droits (F-ADM-11/12), code de pointage (F-ADM-13) et mot de passe
	 * (F-ADM-14). Les secrets générés ne sont affichés qu'une fois, dans la réponse de l'action.
	 */
	import KeyRound from '@lucide/svelte/icons/key-round';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Case from '$lib/components/ui/Case.svelte';
	import LienUnique from './LienUnique.svelte';
	import { dateHeure, fcfa, relatif } from '$lib/format';
	import type { LienReinitialisation, MembreDetail } from '$lib/types/gestion';

	type Retour = {
		cle?: string;
		message?: string;
		champs?: Record<string, string>;
		succes?: string;
		code?: string;
		lien?: LienReinitialisation;
	} | null;

	let { m, form, activation }: { m: MembreDetail; form: Retour | undefined; activation: boolean } = $props();
	const actionnable = $derived(activation && !m.est_moi && m.peut_modifier && m.etat !== 3);
</script>

{#if m.type_compte === 1}
	<section class="carte space-y-3 p-5" aria-labelledby="titre-droits">
		<h2 id="titre-droits" class="flex items-center gap-2 text-lg font-bold"><ShieldCheck class="size-5 text-fleuve-600" aria-hidden="true" />Droits de gestion</h2>
		{#if m.peut_attribuer}
			<Formulaire action="?/droits" {form} cle="droits">
				{#snippet children({ envoi })}
					<div class="space-y-1">
						<Case name="droit_attribution" checked={m.droit_attribution}>
							<strong>Attribution</strong> — donne et retire les droits, nomme les gestionnaires
						</Case>
						<Case name="droit_caisse" checked={m.droit_caisse}><strong>Caisse</strong> — confirme ou rejette les paiements</Case>
						<Case name="droit_activation" checked={m.droit_activation}>
							<strong>Activation</strong> — crée, active, annule ou supprime les fiches
						</Case>
					</div>
					<Bouton type="submit" variante="fleuve" taille="sm" class="mt-3" chargement={envoi}>Enregistrer les droits</Bouton>
				{/snippet}
			</Formulaire>
		{:else}
			<ul class="space-y-1 text-[15px]">
				<li>Attribution : <strong>{m.droit_attribution ? 'oui' : 'non'}</strong></li>
				<li>Caisse : <strong>{m.droit_caisse ? 'oui' : 'non'}</strong></li>
				<li>Activation : <strong>{m.droit_activation ? 'oui' : 'non'}</strong></li>
			</ul>
			<p class="text-sm text-ardoise">Seul un gestionnaire ayant le droit d'attribution peut les modifier.</p>
		{/if}
	</section>
{/if}

<section class="carte space-y-3 p-5" aria-labelledby="titre-pointage">
	<h2 id="titre-pointage" class="flex items-center gap-2 text-lg font-bold"><CreditCard class="size-5 text-fleuve-600" aria-hidden="true" />Carte de pointage</h2>
	<dl class="grid grid-cols-2 gap-2 text-[15px]">
		<div><dt class="text-sm text-ardoise">Carte</dt><dd class="font-semibold">{m.point_caisse_actif ? 'Active' : 'Inactive'}</dd></div>
		<div><dt class="text-sm text-ardoise">Solde</dt><dd class="montant font-semibold">{fcfa(m.solde_point_caisse)}</dd></div>
		<div><dt class="text-sm text-ardoise">Dernier pointage</dt><dd class="font-semibold">{dateHeure(m.date_dernier_pointage)}</dd></div>
		<div><dt class="text-sm text-ardoise">Code</dt><dd class="font-semibold">{m.a_code_pointage ? 'Défini' : 'Aucun'}</dd></div>
	</dl>
	{#if form?.cle === 'code' && form.code}
		<div class="rounded-xl bg-soleil-100 p-4 text-center" role="status">
			<p class="text-sm">Nouveau code à communiquer au membre (affiché une seule fois) :</p>
			<p class="montant mt-1 font-display text-4xl font-bold tracking-[0.3em]">{form.code}</p>
		</div>
	{/if}
	{#if actionnable}
		<Formulaire action="?/code" {form} cle="code" confirmer="Générer un nouveau code de pointage ? L'ancien ne fonctionnera plus.">
			{#snippet children({ envoi })}
				<Bouton type="submit" variante="secondaire" taille="sm" chargement={envoi}>Générer un code à 4 chiffres</Bouton>
			{/snippet}
		</Formulaire>
	{/if}
</section>

<section class="carte space-y-3 p-5" aria-labelledby="titre-mdp">
	<h2 id="titre-mdp" class="flex items-center gap-2 text-lg font-bold"><KeyRound class="size-5 text-fleuve-600" aria-hidden="true" />Mot de passe</h2>
	{#if m.demandes_reinitialisation.length}
		<p class="rounded-xl bg-soleil-100 p-3 text-[15px]">
			Demande « mot de passe oublié » reçue {relatif(m.demandes_reinitialisation[0].date_creation)}. Rappelez le membre pour
			vérifier son identité avant de lui transmettre un lien.
		</p>
	{/if}
	{#if form?.cle === 'mdp' && form.lien}
		<LienUnique lien={form.lien} />
	{:else if actionnable}
		<p class="text-sm text-ardoise">Personne ne voit jamais le mot de passe : vous transmettez un lien à usage unique (24 h).</p>
		<Formulaire action="?/reinitialiser" {form} cle="mdp" confirmer="Créer un lien de réinitialisation ? Les liens précédents seront invalidés.">
			{#snippet children({ envoi })}
				<Bouton type="submit" variante="secondaire" taille="sm" chargement={envoi}>Créer un lien de réinitialisation</Bouton>
			{/snippet}
		</Formulaire>
	{:else if m.est_moi}
		<p class="text-sm text-ardoise">Pour votre propre compte, passez par <a href="/espace/profil" class="lien">Mon profil</a>.</p>
	{/if}
</section>
