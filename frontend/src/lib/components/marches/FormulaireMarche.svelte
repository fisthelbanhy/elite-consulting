<script lang="ts">
	/** Publication / modification d'un appel d'offres (S6-6, F-S6-25 : champs du legacy + dossier PDF). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { MarcheDetail } from '$lib/types/marches';

	let {
		form,
		initial = null,
		annuler,
		libelleBouton = "Publier l'appel d'offres"
	}: {
		form: Record<string, unknown> | null | undefined;
		initial?: MarcheDetail | null;
		annuler: string;
		libelleBouton?: string;
	} = $props();

	const f = $derived(form as { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
	const aujourdhui = new Date().toISOString().slice(0, 10);
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Le marché</legend>
				<h2 class="text-xl font-bold">Le marché</h2>
				<Choix
					legende="Type de marché"
					requis
					options={[
						{ value: '2', label: 'Marché public', description: "État, collectivité, établissement public, bailleur" },
						{ value: '1', label: 'Marché privé', description: 'Entreprise, association, particulier' }
					]}
					{...champ(f, 'type_marche', initial?.type_marche ?? '2')}
				/>
				<Saisie
					label="Numéro d'appel d'offres"
					requis
					maxlength={120}
					aide="Tel qu'il figure sur l'avis (ex. AO n° 014/MEF/2026)."
					{...champ(f, 'numero_appel_offre', initial?.numero_appel_offre)}
				/>
				<Saisie label="Libellé" requis maxlength={500} {...champ(f, 'libelle', initial?.libelle)} />
				<Zone label="Description du marché" lignes={5} {...champ(f, 'description', initial?.description)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Montant du marché" requis inputmode="numeric" suffixe="FCFA" {...champ(f, 'montant', initial?.montant || '')} />
					<Saisie
						label="Date limite de dépôt"
						type="date"
						min={initial ? undefined : aujourdhui}
						aide="Délai de soumission des offres."
						{...champ(f, 'date_limite', initial?.date_limite)}
					/>
				</div>
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Soumission</legend>
				<h2 class="text-xl font-bold">Comment soumissionner</h2>
				<Zone label="Dossier à fournir" lignes={4} {...champ(f, 'dossier_a_fournir', initial?.dossier_a_fournir)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Lieu de dépôt" maxlength={500} {...champ(f, 'lieu_depot', initial?.lieu_depot)} />
					<Saisie label="Adresse e-mail" type="email" {...champ(f, 'email', initial?.email)} />
				</div>
				<Fichier
					label="Dossier d'appel d'offres (PDF)"
					name="document"
					accept="application/pdf"
					image={false}
					aide="Facultatif, 4 Mo maximum."
					actuel={initial?.document_url}
					erreur={f?.champs?.document}
				/>
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Acteurs</legend>
				<h2 class="text-xl font-bold">Acteurs du marché</h2>
				<Saisie label="Maître d'ouvrage" maxlength={500} {...champ(f, 'maitre_ouvrage', initial?.maitre_ouvrage)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Publié par" maxlength={500} aide="Journal, site ou organisme source." {...champ(f, 'publie_par', initial?.publie_par)} />
					<Saisie label="Bénéficiaire" maxlength={500} {...champ(f, 'beneficiaire', initial?.beneficiaire)} />
				</div>
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
