<script lang="ts">
	/** Création / modification d'une fiche de l'annuaire (S6-2, F-S6-05 à F-S6-12). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { Option, Secteur, Ville } from '$lib/types';

	type Initial = {
		nom?: string;
		domaine_id?: number | null;
		forme_juridique?: number | null;
		capital_social?: number;
		description?: string;
		gerant?: string;
		telephone?: string;
		email?: string;
		site_web?: string;
		adresse?: string;
		ville_id?: number | null;
		logo_url?: string | null;
	};

	let {
		form,
		secteurs,
		villes,
		formes,
		initial = {},
		annuler,
		libelleBouton = "Inscrire l'entreprise"
	}: {
		form: Record<string, unknown> | null | undefined;
		secteurs: Secteur[];
		villes: Ville[];
		formes: Option[];
		initial?: Initial;
		annuler: string;
		libelleBouton?: string;
	} = $props();

	const f = $derived(form as { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	const groupes = $derived(secteurs.map((s) => ({ label: s.libelle, options: s.domaines.map((d) => ({ value: d.id, label: d.libelle })) })));
	const optionsVilles = $derived(villes.map((v) => ({ value: v.id, label: v.nom })));
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">L'entreprise</legend>
				<h2 class="text-xl font-bold">L'entreprise</h2>
				<Saisie label="Nom de l'entreprise" requis maxlength={150} autocomplete="organization" {...champ(f, 'nom', initial.nom)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Liste label="Forme juridique" requis options={formes} {...champ(f, 'forme_juridique', initial.forme_juridique)} />
					<Saisie
						label="Capital social"
						inputmode="numeric"
						suffixe="FCFA"
						aide="Facultatif."
						{...champ(f, 'capital_social', initial.capital_social || '')}
					/>
				</div>
				<Liste
					label="Domaine d'activité"
					requis
					{groupes}
					aide="Le secteur d'activité est déduit du domaine choisi."
					{...champ(f, 'domaine_id', initial.domaine_id)}
				/>
				<Saisie label="Gérant ou gérante" maxlength={120} {...champ(f, 'gerant', initial.gerant)} />
				<Zone
					label="Description de l'activité"
					lignes={5}
					aide="Ce que vous vendez ou proposez, vos clients, vos atouts : c'est ce que lisent vos futurs clients."
					{...champ(f, 'description', initial.description)}
				/>
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Coordonnées</legend>
				<div>
					<h2 class="text-xl font-bold">Coordonnées de l'entreprise</h2>
					<p class="mt-1 text-[15px] text-ardoise">Elles sont publiées dans l'annuaire : c'est ainsi que vos clients et partenaires vous contactent.</p>
				</div>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" autocomplete="tel-national" {...champ(f, 'telephone', initial.telephone)} />
					<Saisie label="E-mail" type="email" autocomplete="email" {...champ(f, 'email', initial.email)} />
				</div>
				<Saisie label="Site internet" inputmode="url" placeholder="www.monentreprise.cg" {...champ(f, 'site_web', initial.site_web)} />
				<div class="grid gap-5 sm:grid-cols-[1fr_14rem]">
					<Saisie label="Adresse" aide="Ex. 59 rue Bétou, Moungali" autocomplete="street-address" {...champ(f, 'adresse', initial.adresse)} />
					<Liste label="Ville" requis options={optionsVilles} {...champ(f, 'ville_id', initial.ville_id)} />
				</div>
			</fieldset>

			<fieldset class="carte p-6">
				<legend class="sr-only">Logo</legend>
				<Fichier
					label="Logo ou photo de l'entreprise"
					name="logo"
					aide="JPG, PNG ou WebP, 4 Mo maximum. Une fiche avec logo inspire davantage confiance."
					actuel={initial.logo_url}
					erreur={f?.champs?.logo}
				/>
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
