<script lang="ts">
	/** Création / modification d'un groupe Likelemba (F-S4-30 à F-S4-32). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, erreur, valeur } from '$lib/forms';
	import type { GroupeDetail, MembreChoix } from '$lib/types/likelemba';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string } | null | undefined;

	let {
		form,
		membres,
		initial,
		libelleBouton = 'Créer le likelemba'
	}: { form: Retour; membres: MembreChoix[]; initial?: GroupeDetail | null; libelleBouton?: string } = $props();
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Le groupe</legend>
				<h2 class="text-xl font-bold">Le groupe</h2>
				<Liste
					label="Responsable (chef du likelemba)"
					requis
					aide="Il inscrit les membres et valide les reçus. Il est prévenu par message."
					options={membres.map((m) => ({ value: m.id, label: m.pseudonyme ? `${m.nom} (${m.pseudonyme})` : m.nom }))}
					{...champ(form, 'responsable_id', initial?.responsable?.id)}
				/>
				<Saisie label="Cotisation par personne" type="number" inputmode="numeric" min="1" step="1" suffixe="FCFA" requis {...champ(form, 'montant_cotisation', initial?.montant_cotisation)} />
				<Choix
					legende="Périodicité"
					name="periodicite"
					requis
					colonnes={3}
					value={String(valeur(form, 'periodicite', initial?.periodicite ?? ''))}
					erreur={erreur(form, 'periodicite')}
					options={[
						{ value: 1, label: 'Hebdomadaire', description: 'Chaque semaine' },
						{ value: 2, label: 'Quinzaine', description: 'Toutes les deux semaines' },
						{ value: 3, label: 'Mensuelle', description: 'Chaque mois' }
					]}
				/>
				<Saisie label="Date de début" type="date" aide="Sert à établir le calendrier indicatif des tours." {...champ(form, 'date_debut', initial?.date_debut)} />
				<Zone label="Observation" lignes={3} placeholder="Qui sont les membres, lieu de rencontre, règles particulières…" {...champ(form, 'observation', initial?.observation)} />
			</fieldset>
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/likelemba/${initial.id}` : '/likelemba'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
