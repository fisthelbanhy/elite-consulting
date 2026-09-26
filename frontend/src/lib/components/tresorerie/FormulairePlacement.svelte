<script lang="ts">
	/**
	 * Demande de placement (S7-9, F-S7-25/26) : le changement de type ne recharge plus la page ni
	 * n'efface les autres saisies ; banques en cases à cocher, sans limite d'identifiant.
	 */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { BanqueCourte, PlacementDetail } from '$lib/types/tresorerie';

	let {
		form,
		banques,
		initial = null,
		action = '',
		annuler = '/tresorerie/placements'
	}: {
		form: Record<string, unknown> | null | undefined;
		banques: BanqueCourte[];
		initial?: PlacementDetail | null;
		action?: string;
		annuler?: string;
	} = $props();

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	// Seul le retour de ce formulaire (la page porte aussi le dialogue et le suivi)
	const f = $derived((form as Retour)?.cle === 'fiche' ? (form as Retour) : null);
	const depart = () => String(valeur(f, 'type_placement', initial?.type_placement ?? ''));
	let type = $state(depart());
	const cochees = $derived(new Set((valeur(f, 'banques', (initial?.banques_ids ?? []).map(String)) as string[]).map(String)));
</script>

<Formulaire {action} form={f} cle="fiche">
	{#snippet children({ envoi })}
		<div class="space-y-6">
			<div class="carte space-y-5 p-5 sm:p-6">
				<Choix
					legende="Type de placement"
					name="type_placement"
					bind:value={type}
					requis
					erreur={f?.champs?.type_placement}
					options={[
						{ value: '1', label: 'Dépôt à terme', description: 'Votre épargne bloquée pour une durée, à un taux fixé' },
						{ value: '2', label: 'Investissement', description: 'Financer une activité dans un secteur choisi' }
					]}
				/>
				{#if type === '2'}
					<Saisie label="Secteur d'activité à investir" maxlength={120} {...champ(f, 'secteur_activite', initial?.secteur_activite)} />
				{/if}
				<div class="grid gap-5 sm:grid-cols-3">
					<Saisie label="Montant à placer" inputmode="numeric" suffixe="FCFA" requis autocomplete="off" {...champ(f, 'montant', initial?.montant)} />
					<Saisie label="Durée" type="number" min={1} max={120} suffixe="mois" requis {...champ(f, 'duree_mois', initial?.duree_mois)} />
					<Saisie label="Taux escompté" inputmode="decimal" suffixe="%" requis autocomplete="off" {...champ(f, 'taux', initial?.taux)} />
				</div>
			</div>

			<fieldset class="carte space-y-3 p-5 sm:p-6" id="champ-banques">
				<legend class="sr-only">Banques à consulter *</legend>
					<h2 class="text-lg font-bold">Banques à consulter <span class="text-laterite-600">*</span></h2>
				<p class="text-sm text-ardoise">Cochez une ou plusieurs banques : nous comparons leurs propositions pour vous.</p>
				<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each banques as b (b.id)}
						<label class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-fleuve-100 bg-white px-3.5 has-checked:border-fleuve-700 has-checked:bg-fleuve-50">
							<input type="checkbox" name="banques" value={b.id} checked={cochees.has(String(b.id))} />
							<span class="font-semibold">{b.nom}</span>
						</label>
					{/each}
				</div>
				{#if f?.champs?.banques}<p class="text-sm font-medium text-alerte">{f.champs.banques}</p>{/if}
			</fieldset>

			<div class="carte p-5 sm:p-6">
				<Zone label="Observation" lignes={3} aide="Vos attentes, vos contraintes, une question pour le conseiller…" {...champ(f, 'observation', initial?.observation)} />
			</div>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{initial ? 'Enregistrer les modifications' : 'Envoyer ma demande'}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
