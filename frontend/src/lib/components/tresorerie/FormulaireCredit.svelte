<script lang="ts">
	/** Demande de crédit (S7-12, F-S7-35) : l'apport personnel affiche enfin sa propre valeur. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { CreditDetail } from '$lib/types/tresorerie';

	let {
		form,
		initial = null,
		action = '',
		annuler = '/tresorerie/credits'
	}: {
		form: Record<string, unknown> | null | undefined;
		initial?: CreditDetail | null;
		action?: string;
		annuler?: string;
	} = $props();

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	// Seul le retour de ce formulaire (la page porte aussi le dialogue et le suivi)
	const f = $derived((form as Retour)?.cle === 'fiche' ? (form as Retour) : null);
</script>

<Formulaire {action} form={f} cle="fiche">
	{#snippet children({ envoi })}
		<div class="space-y-6">
			<fieldset class="carte space-y-5 p-5 sm:p-6">
				<legend class="sr-only">Votre besoin</legend>
					<h2 class="text-lg font-bold">Votre besoin</h2>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Montant du crédit" inputmode="numeric" suffixe="FCFA" requis autocomplete="off" {...champ(f, 'montant', initial?.montant)} />
					<Saisie label="Durée de remboursement" type="number" min={1} max={120} suffixe="mois" requis {...champ(f, 'duree_mois', initial?.duree_mois)} />
				</div>
				<Zone label="Objet du crédit" lignes={3} requis aide="À quoi servira l'argent ? (achat de matériel, stock, travaux…)" {...champ(f, 'objet', initial?.objet)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Niveau de réalisation du projet" type="number" min={0} max={100} suffixe="%" {...champ(f, 'niveau_realisation', initial?.niveau_realisation ?? 0)} />
					<Saisie label="Délai de réponse souhaité" type="number" min={0} max={366} suffixe="jours" {...champ(f, 'delai_reponse_jours', initial?.delai_reponse_jours ?? 0)} />
				</div>
			</fieldset>

			<fieldset class="carte space-y-5 p-5 sm:p-6">
				<legend class="sr-only">Financement et garanties</legend>
					<h2 class="text-lg font-bold">Financement et garanties</h2>
				<Zone label="Garantie proposée" lignes={3} requis aide="Hypothèque, nantissement, caution, domiciliation de salaire…" {...champ(f, 'garantie', initial?.garantie)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Zone label="Devis global du projet" lignes={3} {...champ(f, 'devis_global', initial?.devis_global)} />
					<Zone label="Apport sur fonds propres" lignes={3} {...champ(f, 'apport_propre', initial?.apport_propre)} />
				</div>
				<Zone label="Observation et choix des banques" lignes={3} aide="Les banques que vous préférez, et toute précision utile au conseiller." {...champ(f, 'observation', initial?.observation)} />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{initial ? 'Enregistrer les modifications' : 'Envoyer ma demande'}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
