<script lang="ts">
	/** Publication / modification d'un projet (S6-8, F-S6-29). La limite de 20 caractères du legacy
	 * est levée (F-S6-32) : voir docs/modules/entreprises-marches.md. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { ProjetDetail } from '$lib/types/marches';

	let {
		form,
		initial = null,
		annuler,
		libelleBouton = 'Publier le projet'
	}: {
		form: Record<string, unknown> | null | undefined;
		initial?: ProjetDetail | null;
		annuler: string;
		libelleBouton?: string;
	} = $props();

	const f = $derived(form as { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	// Legacy : liste 0 à 120 mois
	const durees = Array.from({ length: 121 }, (_, n) => ({ value: n, label: n === 0 ? 'Moins d’un mois' : `${n} mois` }));
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Le projet</legend>
				<h2 class="text-xl font-bold">Le projet</h2>
				<Saisie label="Libellé" requis maxlength={150} aide="Le nom court du projet (ex. PDAC)." {...champ(f, 'libelle', initial?.libelle)} />
				<Saisie label="Objet du projet" requis maxlength={150} {...champ(f, 'objet', initial?.objet)} />
				<Saisie label="Objectif" maxlength={500} {...champ(f, 'objectif', initial?.objectif)} />
				<Zone label="Description du projet" lignes={5} {...champ(f, 'description', initial?.description)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Liste label="Durée" requis options={durees} vide="Choisir la durée…" {...champ(f, 'duree_mois', initial?.duree_mois)} />
					<Saisie label="Date de lancement" type="date" {...champ(f, 'date_lancement', initial?.date_lancement)} />
				</div>
				<Zone label="Conditions d'éligibilité" lignes={4} aide="Qui peut répondre ou participer ?" {...champ(f, 'conditions', initial?.conditions)} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Porteurs</legend>
				<h2 class="text-xl font-bold">Porteurs du projet</h2>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Responsable" requis maxlength={150} {...champ(f, 'responsable', initial?.responsable)} />
					<Saisie label="Promoteur" requis maxlength={150} aide="Organisme ou bailleur." {...champ(f, 'promoteur', initial?.promoteur)} />
				</div>
				<Saisie label="Adresse" maxlength={300} {...champ(f, 'adresse', initial?.adresse)} />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
