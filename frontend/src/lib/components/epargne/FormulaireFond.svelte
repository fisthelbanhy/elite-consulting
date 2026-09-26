<script lang="ts">
	/** Souscription d'un don ou d'un placement (F-S4-47 à F-S4-52). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, erreur, valeur } from '$lib/forms';
	import { fcfa } from '$lib/format';
	import type { StatutEpargne } from '$lib/types/epargne';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string } | null | undefined;

	let { form, statut }: { form: Retour; statut: StatutEpargne } = $props();

	// svelte-ignore state_referenced_locally
	let type = $state(String(valeur(form, 'type_fond', '')));
	const placement = $derived(type === '2');
	const minimum = $derived(placement ? statut.placement_minimum : statut.don_minimum);
	const autreNom = $derived(!!valeur(form, 'souscripteur_nom', ''));
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Type d'épargne</legend>
				<Choix
					legende="Vous souhaitez faire"
					name="type_fond"
					requis
					bind:value={type}
					erreur={erreur(form, 'type_fond')}
					options={[
						{ value: 1, label: 'Un don', description: `Un geste solidaire, à partir de ${fcfa(statut.don_minimum)}` },
						{ value: 2, label: 'Un placement', description: `Pour ${statut.duree_min} à ${statut.duree_max} mois, à partir de ${fcfa(statut.placement_minimum)}` }
					]}
				/>
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Montant</legend>
				<h2 class="text-xl font-bold">Montant{placement ? ' et durée' : ''}</h2>
				<Saisie label="Montant" type="number" inputmode="numeric" min={minimum} step="1" suffixe="FCFA" requis aide="Minimum : {fcfa(minimum)}." {...champ(form, 'montant')} />
				{#if type !== '1'}
					<Saisie
						label="Durée du placement (mois)"
						type="number"
						inputmode="numeric"
						min={statut.duree_min}
						max={statut.duree_max}
						step="1"
						suffixe="mois"
						requis={placement}
						aide="Entre {statut.duree_min} et {statut.duree_max} mois (placement uniquement)."
						{...champ(form, 'duree_mois', 12)}
					/>
				{/if}
				<Zone label="Motivation (facultatif)" lignes={3} placeholder="Pourquoi ce geste, pour qui, pour quel projet…" {...champ(form, 'motivation')} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Souscripteur</legend>
				<div>
					<h2 class="text-xl font-bold">Au nom de qui ?</h2>
					<p class="mt-1 text-[15px] text-ardoise">Laissez vide pour souscrire en votre nom. Si vous souscrivez pour un autre membre, il est prévenu par message et par e-mail pour le paiement.</p>
				</div>
				<Saisie label="Pseudonyme ou téléphone du membre bénéficiaire" autocomplete="off" placeholder="ex. mireille ou 06 123 45 67" {...champ(form, 'souscripteur_membre')} />
				<details open={autreNom} class="rounded-xl bg-creme p-4">
					<summary class="cursor-pointer font-semibold text-fleuve-700">La personne n'est pas inscrite sur La Frangine</summary>
					<div class="mt-3"><Saisie label="Nom et prénom de la personne" {...champ(form, 'souscripteur_nom')} /></div>
				</details>
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>Enregistrer {placement ? 'le placement' : type === '1' ? 'le don' : ''}</Bouton>
				<Bouton href="/epargne/dons-placements" variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
