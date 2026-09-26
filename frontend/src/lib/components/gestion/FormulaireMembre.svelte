<script lang="ts">
	/**
	 * Création / modification complète d'une fiche membre par un gestionnaire (F-ADM-09/10) :
	 * le formulaire s'adapte à la personnalité sans perdre la saisie (correctif F-TRV-14).
	 * Les droits et le mot de passe ont leurs propres actions sur la fiche.
	 */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Case from '$lib/components/ui/Case.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { Enums, Secteur, Ville } from '$lib/types';
	import type { MembreDetail } from '$lib/types/gestion';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; valeurs?: Record<string, unknown>; succes?: string };

	let {
		form,
		initial = null,
		villes,
		secteurs,
		enums,
		peutAttribuer = false,
		annuler
	}: {
		form: Retour | null | undefined;
		initial?: MembreDetail | null;
		villes: Ville[];
		secteurs: Secteur[];
		enums: Enums;
		peutAttribuer?: boolean;
		annuler: string;
	} = $props();

	// Valeurs initiales figées au montage ; la saisie en cours est ensuite gérée par le formulaire
	// svelte-ignore state_referenced_locally
	let categorie = $state(String(valeur(form, 'categorie', initial?.categorie ?? 1)));
	// svelte-ignore state_referenced_locally
	let type = $state(String(valeur(form, 'type_compte', initial?.type_compte ?? 3)));
	const physique = $derived(categorie === '1');
	const opts = (nom: string) => enums[nom] ?? [];
	const groupes = $derived(secteurs.map((s) => ({ label: s.libelle, options: s.domaines.map((d) => ({ value: d.id, label: d.libelle })) })));
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-6">
			<fieldset class="carte space-y-5 p-5">
				<legend class="sr-only">Compte</legend>
				<h2 class="text-lg font-bold">Compte</h2>
				<Choix
					legende="Personnalité"
					name="categorie"
					bind:value={categorie}
					requis
					options={[
						{ value: '1', label: 'Personne physique', description: 'Particulier, commerçant·e' },
						{ value: '2', label: 'Personne morale', description: 'Entreprise, association, banque, boutique' }
					]}
					erreur={form?.champs?.categorie}
				/>
				<div class="grid gap-5 sm:grid-cols-3">
					<Liste
						label="Type de compte"
						requis
						vide={null}
						bind:value={type}
						options={opts('TypeMembre')}
						aide={peutAttribuer ? undefined : 'Seul un gestionnaire ayant le droit d’attribution nomme un gestionnaire.'}
						name="type_compte"
						erreur={form?.champs?.type_compte}
					/>
					<Liste label="État de la fiche" requis vide={null} options={[{ value: 1, label: 'Non traité (à valider)' }, { value: 2, label: 'Autorisé' }, { value: 3, label: 'Supprimé' }]} {...champ(form, 'etat', initial?.etat ?? 2)} />
					<Saisie label="Identifiant de connexion" requis autocomplete="off" aide="4 à 50 caractères : lettres, chiffres, . _ - @" {...champ(form, 'identifiant', initial?.identifiant)} />
				</div>
				{#if !initial}
					<Saisie
						label="Mot de passe (facultatif)"
						type="password"
						name="mot_de_passe"
						autocomplete="new-password"
						aide="Laissez vide : un lien d'activation sera créé pour que le membre choisisse lui-même son mot de passe (recommandé)."
						erreur={form?.champs?.mot_de_passe}
					/>
				{/if}
			</fieldset>

			<fieldset class="carte space-y-5 p-5">
				<legend class="sr-only">Identité</legend>
				<h2 class="text-lg font-bold">Identité</h2>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label={physique ? 'Nom et prénom' : "Nom de l'entreprise"} requis {...champ(form, 'nom', initial?.nom)} />
					<Saisie
						label={physique ? 'Pseudonyme (nom public)' : 'Sigle'}
						requis
						aide={physique ? '6 caractères minimum' : '3 caractères minimum'}
						{...champ(form, 'pseudonyme', initial?.pseudonyme)}
					/>
				</div>
				{#if physique}
					<div class="grid gap-5 sm:grid-cols-3">
						<Liste label="Sexe" vide="Non précisé" options={opts('Sexe').filter((o) => o.value !== 3)} {...champ(form, 'sexe', initial?.sexe === 3 ? '' : initial?.sexe)} />
						<Liste label="Situation matrimoniale" vide="Non précisée" options={opts('EtatCivil')} {...champ(form, 'situation_matrimoniale', initial?.situation_matrimoniale)} />
						<Saisie label="Nombre d'enfants" type="number" min="0" max="30" {...champ(form, 'nombre_enfants', initial?.nombre_enfants ?? 0)} />
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<Saisie label="Employeur" {...champ(form, 'employeur', initial?.employeur)} />
						<Saisie label="N° de pièce d'identité" {...champ(form, 'numero_piece_identite', initial?.numero_piece_identite)} />
					</div>
				{:else}
					<div class="grid gap-5 sm:grid-cols-3">
						<Liste label="Forme juridique" vide="Non précisée" options={opts('FormeJuridique')} {...champ(form, 'forme_juridique', initial?.forme_juridique)} />
						<Liste
							label="Banque ou boutique"
							vide="Ni l'un ni l'autre"
							options={opts('BanqueBoutique')}
							aide="« Banque » l'ajoute au référentiel des banques."
							{...champ(form, 'type_partenaire', initial?.type_partenaire)}
						/>
						<Saisie label="RCCM / n° d'identification" {...champ(form, 'numero_piece_identite', initial?.numero_piece_identite)} />
					</div>
					<Liste label="Domaine d'activité" vide="Non précisé" {groupes} {...champ(form, 'domaine_activite_id', initial?.domaine_activite_id)} />
				{/if}
			</fieldset>

			<fieldset class="carte space-y-5 p-5">
				<legend class="sr-only">Coordonnées</legend>
				<h2 class="text-lg font-bold">Coordonnées</h2>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" {...champ(form, 'telephone', initial?.telephone)} />
					<Saisie label="E-mail" type="email" {...champ(form, 'email', initial?.email)} />
					<Liste label="Ville" requis options={villes.map((v) => ({ value: v.id, label: v.nom }))} {...champ(form, 'ville_id', initial?.ville_id)} />
					<Saisie label="Adresse" {...champ(form, 'adresse', initial?.adresse)} />
				</div>
			</fieldset>

			<fieldset class="carte space-y-5 p-5">
				<legend class="sr-only">Suivi par la frangine</legend>
				<h2 class="text-lg font-bold">Suivi par la frangine</h2>
				<Case name="point_caisse_actif" checked={!!valeur(form, 'point_caisse_actif', initial?.point_caisse_actif ?? false)}>
					Carte de pointage (épargne) active pour ce membre
				</Case>
				{#if type === '2'}
					<Saisie label="Date limite Master" type="date" aide="Fin de la période payée du statut Master." {...champ(form, 'date_limite_master', initial?.date_limite_master)} />
				{:else}
					<input type="hidden" name="date_limite_master" value={initial?.date_limite_master ?? ''} />
				{/if}
				<Zone label="Observation (visible des seuls gestionnaires)" lignes={3} {...champ(form, 'observation', initial?.observation)} />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{initial ? 'Enregistrer les modifications' : 'Créer la fiche'}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
