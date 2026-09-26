<script lang="ts">
	/** Promesse d'apport (« Intéressement », F-S4-21) : type, montant ≤ besoin, échéance, remarque. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, erreur, valeur } from '$lib/forms';
	import { fcfa } from '$lib/format';

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string; succes?: string } | null | undefined;

	let { form, besoin }: { form: Retour; besoin: number } = $props();

	const echeances = Array.from({ length: 13 }, (_, i) => ({ value: i, label: i === 0 ? 'Sans échéance' : `${i} mois` }));
</script>

<Formulaire action="?/apport" {form} cle="apport">
	{#snippet children({ envoi })}
		<div class="space-y-5">
			<p class="rounded-xl bg-creme p-3 text-[15px]">Besoin de financement : <strong class="montant">{fcfa(besoin)}</strong></p>
			<Choix
				legende="Type d'apport"
				name="type_apport"
				requis
				colonnes={1}
				value={String(valeur(form, 'type_apport', '', 'apport'))}
				erreur={erreur(form, 'type_apport', 'apport')}
				options={[
					{ value: 1, label: 'Don', description: 'Vous donnez, sans contrepartie' },
					{ value: 2, label: 'Crédit', description: 'Vous prêtez, le porteur rembourse' },
					{ value: 3, label: 'Actionnariat', description: 'Vous entrez au capital du projet' }
				]}
			/>
			<Saisie label="Montant promis" type="number" inputmode="numeric" min="1" max={besoin} step="1" suffixe="FCFA" requis {...champ(form, 'montant_promis', '', 'apport')} />
			<Liste label="Échéance de versement" vide={null} options={echeances} {...champ(form, 'echeance_mois', 0, 'apport')} />
			<Zone label="Remarque (facultatif)" lignes={3} placeholder="Conditions, calendrier de versement…" {...champ(form, 'remarque', '', 'apport')} />
			<Bouton type="submit" pleineLargeur chargement={envoi}>Je soutiens ce projet</Bouton>
		</div>
	{/snippet}
</Formulaire>
