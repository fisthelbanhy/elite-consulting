<script lang="ts">
	/** Formulaire de création / modification d'une demande ou offre d'emploi (F-S2-11/12). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { Secteur } from '$lib/types';
	import type { AnnonceDetail } from '$lib/types/emplois';

	let {
		form,
		secteurs,
		initial,
		typeInitial = '1',
		libelleBouton = 'Publier'
	}: {
		form: Record<string, unknown> | null | undefined;
		secteurs: Secteur[];
		initial?: AnnonceDetail | null;
		typeInitial?: string;
		libelleBouton?: string;
	} = $props();

	const f = $derived(form as { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	let type = $state(String(valeur(form as never, 'type_annonce', initial?.type_annonce ?? typeInitial)));
	const demande = $derived(type === '1');
	const groupes = $derived(secteurs.map((s) => ({ label: s.libelle, options: s.domaines.map((d) => ({ value: d.id, label: d.libelle })) })));
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			{#if !initial}
				<Choix
					legende="Vous publiez"
					name="type_annonce"
					bind:value={type}
					requis
					options={[
						{ value: '1', label: "Une demande d'emploi", description: 'Je cherche un travail, je présente mon profil' },
						{ value: '2', label: "Une offre d'emploi", description: 'Je recrute, je présente le poste' }
					]}
				/>
			{:else}
				<input type="hidden" name="type_annonce" value={type} />
			{/if}

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Le poste</legend>
				<h2 class="text-xl font-bold">{demande ? 'Votre profil' : 'Le poste'}</h2>
				<Liste label="Domaine d'activité" requis {groupes} {...champ(f, 'domaine_id', initial?.domaine_id)} />
				{#if !demande}
					<Saisie label="Poste à pourvoir" requis placeholder="Ex. Comptable, chauffeur, développeur web…" {...champ(f, 'poste_a_pourvoir', initial?.poste_a_pourvoir)} />
				{/if}
				<Zone label={demande ? 'Compétences' : 'Compétences requises'} lignes={3} {...champ(f, 'competences', initial?.competences)} />
				<Zone label="Diplômes" lignes={2} placeholder="Ex. BAC, Licence en gestion…" {...champ(f, 'diplomes', initial?.diplomes)} />
				<Zone label={demande ? 'Expérience professionnelle' : 'Expérience souhaitée'} lignes={4} {...champ(f, 'experience', initial?.experience)} />
				<Zone label="Autres informations" lignes={3} {...champ(f, 'autres_informations', initial?.autres_informations)} />
			</fieldset>

			{#if demande}
				<fieldset class="carte space-y-5 p-6">
					<legend class="sr-only">Identité</legend>
					<div>
						<h2 class="text-xl font-bold">Identité et coordonnées</h2>
						<p class="mt-1 text-[15px] text-ardoise">Visibles uniquement par vous et la frangine. Les recruteurs vous contactent par son intermédiaire.</p>
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<Saisie label="Nom" requis autocomplete="family-name" {...champ(f, 'nom', initial?.nom)} />
						<Saisie label="Prénom" autocomplete="given-name" {...champ(f, 'prenom', initial?.prenom)} />
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<Liste label="Sexe" requis options={[{ value: 1, label: 'Féminin' }, { value: 2, label: 'Masculin' }]} {...champ(f, 'sexe', initial?.sexe === 3 ? '' : initial?.sexe)} />
						<Saisie label="Date de naissance" type="date" {...champ(f, 'date_naissance', initial?.date_naissance)} />
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" requis {...champ(f, 'telephone', initial?.telephone)} />
						<Saisie label="E-mail" type="email" {...champ(f, 'email', initial?.email)} />
					</div>
					<Saisie label="Adresse" {...champ(f, 'adresse', initial?.adresse)} />
				</fieldset>
			{/if}

			<fieldset class="carte grid gap-5 p-6 sm:grid-cols-2">
				<legend class="sr-only">Pièces jointes</legend>
				<Fichier label={demande ? 'Photo' : 'Logo ou photo'} name="photo" actuel={initial?.photo_url} erreur={f?.champs?.photo} />
				<Fichier label="CV ou fiche de poste (PDF)" name="cv" accept="application/pdf" image={false} actuel={initial?.cv_url} erreur={f?.champs?.cv} />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/emplois/${initial.id}` : '/emplois'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
