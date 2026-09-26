<script lang="ts">
	/**
	 * Profil du membre (E-TRV-05) : les champs complémentaires dépendent de la personnalité
	 * (sexe, situation, enfants, pièce, employeur / forme juridique, banque-boutique, domaine).
	 * La personnalité et le type de compte ne sont pas modifiables par le membre (F-TRV-27).
	 */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { Enums, MembreMoi, Secteur, Ville } from '$lib/types';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; valeurs?: Record<string, unknown>; succes?: string };
	let { form, membre, villes, secteurs, enums }: { form: Retour | null | undefined; membre: MembreMoi; villes: Ville[]; secteurs: Secteur[]; enums: Enums } = $props();

	const physique = $derived(membre.categorie === 1);
	const c = (nom: string, initiale: unknown) => champ(form, nom, initiale, 'profil');
	const groupes = $derived(secteurs.map((s) => ({ label: s.libelle, options: s.domaines.map((d) => ({ value: d.id, label: d.libelle })) })));
</script>

<Formulaire action="?/profil" {form} cle="profil">
	{#snippet children({ envoi })}
		<div class="space-y-5">
			<div class="grid gap-5 sm:grid-cols-2">
				<Saisie label={physique ? 'Nom et prénom' : "Nom de l'entreprise"} requis autocomplete={physique ? 'name' : 'organization'} {...c('nom', membre.nom)} />
				<Saisie
					label={physique ? 'Nom affiché publiquement (pseudonyme)' : 'Sigle affiché publiquement'}
					aide={physique ? '6 caractères minimum. C’est lui que voient les autres membres.' : '3 caractères minimum.'}
					{...c('pseudonyme', membre.pseudonyme)}
				/>
				<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" requis autocomplete="tel-national" aide="Jamais affiché publiquement." {...c('telephone', membre.telephone)} />
				<Saisie label="E-mail" type="email" autocomplete="email" aide="Utile pour récupérer votre compte seul·e." {...c('email', membre.email)} />
				<Liste label="Ville" requis options={villes.map((v) => ({ value: v.id, label: v.nom }))} {...c('ville_id', membre.ville_id)} />
				<Saisie label="Adresse" autocomplete="street-address" {...c('adresse', membre.adresse)} />
			</div>

			{#if physique}
				<div class="grid gap-5 sm:grid-cols-3">
					<Liste label="Sexe" vide="Non précisé" options={(enums.Sexe ?? []).filter((o) => o.value !== 3)} {...c('sexe', membre.sexe === 3 ? '' : membre.sexe)} />
					<Liste label="Situation matrimoniale" vide="Non précisée" options={enums.EtatCivil ?? []} {...c('situation_matrimoniale', membre.situation_matrimoniale)} />
					<Saisie label="Nombre d'enfants" type="number" min="0" max="20" {...c('nombre_enfants', membre.nombre_enfants)} />
				</div>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="N° de pièce d'identité" aide="Demandé pour la Likelemba et les engagements financiers." {...c('numero_piece_identite', membre.numero_piece_identite)} />
					<Saisie label="Employeur" {...c('employeur', membre.employeur)} />
				</div>
			{:else}
				<div class="grid gap-5 sm:grid-cols-3">
					<Liste label="Forme juridique" vide="Non précisée" options={enums.FormeJuridique ?? []} {...c('forme_juridique', membre.forme_juridique)} />
					<Liste label="Vous êtes une banque ou une boutique ?" vide="Ni l'un ni l'autre" options={enums.BanqueBoutique ?? []} {...c('type_partenaire', membre.type_partenaire)} />
					<Saisie label="RCCM / n° d'identification" {...c('numero_piece_identite', membre.numero_piece_identite)} />
				</div>
				<Liste label="Domaine d'activité" vide="Non précisé" {groupes} {...c('domaine_activite_id', membre.domaine_activite_id)} />
			{/if}

			<Bouton type="submit" chargement={envoi}>Enregistrer mon profil</Bouton>
		</div>
	{/snippet}
</Formulaire>
