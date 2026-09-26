<script lang="ts">
	/** Création / modification d'un sujet (F-S7-04, F-S7-08). Retour d'action filtré par `cle="sujet"`. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { SujetDetail } from '$lib/types/conseil-financier';

	let {
		form,
		initial = null,
		rubriqueInitiale = '1',
		action = '',
		annuler = '/conseil-financier'
	}: {
		form: Record<string, unknown> | null | undefined;
		initial?: SujetDetail | null;
		rubriqueInitiale?: string;
		action?: string;
		annuler?: string;
	} = $props();

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	const f = $derived((form as Retour)?.cle === 'sujet' ? (form as Retour) : null);
	// Valeurs de départ (saisie réaffichée après erreur, sinon fiche) ; ensuite pilotées par l'utilisateur
	const depart = (nom: 'rubrique' | 'confidentialite') =>
		String(valeur(f, nom, nom === 'rubrique' ? (initial?.rubrique ?? rubriqueInitiale) : (initial?.confidentialite ?? 1)));
	let rubrique = $state(depart('rubrique'));
	let confidentialite = $state(depart('confidentialite'));
</script>

<Formulaire {action} form={f} cle="sujet">
	{#snippet children({ envoi })}
		<div class="space-y-6">
			{#if !initial}
				<Choix
					legende="Rubrique"
					name="rubrique"
					bind:value={rubrique}
					requis
					options={[
						{ value: '1', label: 'Conseil financier', description: 'Votre question à un conseiller : épargne, crédit, banque, gestion' },
						{ value: '2', label: 'Actus & décryptages', description: 'Une actualité économique à partager ou à comprendre, en public' }
					]}
				/>
			{:else}
				<input type="hidden" name="rubrique" value={rubrique} />
			{/if}
			<div class="carte space-y-5 p-5 sm:p-6">
				<Saisie label="Objet" requis minlength={2} maxlength={120} placeholder="Ex. : Quel compte pour épargner chaque mois ?" {...champ(f, 'objet', initial?.objet)} />
				<Zone
					label={rubrique === '1' ? 'Votre question' : 'Votre message'}
					lignes={7}
					requis
					minlength={2}
					maxlength={5000}
					aide={rubrique === '1' ? 'Donnez le contexte : montant, délai, votre activité… Plus c’est précis, meilleure est la réponse.' : undefined}
					{...champ(f, 'texte', initial?.texte)}
				/>
				{#if rubrique === '1'}
					<Choix
						legende="Qui peut lire votre question ?"
						name="confidentialite"
						bind:value={confidentialite}
						options={[
							{ value: '1', label: 'Moi et mon conseiller', description: 'Échange privé et confidentiel' },
							{ value: '2', label: 'Tous les membres', description: 'La réponse pourra aider d’autres membres' }
						]}
					/>
				{/if}
			</div>
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{initial ? 'Enregistrer les modifications' : rubrique === '1' ? 'Envoyer ma question' : 'Publier'}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
