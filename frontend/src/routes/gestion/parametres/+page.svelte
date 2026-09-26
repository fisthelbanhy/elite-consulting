<script lang="ts">
	/**
	 * Paramètres du site (legacy `pparametre.php`, F-ADM-01 à F-ADM-04) : nom du site modifiable
	 * (correctif F-ADM-02), téléphones validés avec un message par champ (correctif F-ADM-04),
	 * interrupteurs des modules à risque réglementaire (ADR-0009).
	 */
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Case from '$lib/components/ui/Case.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';

	let { data, form } = $props();
	const p = $derived(data.reglages);
	const textes = $derived(data.reglages as unknown as Record<string, string>);
	const sections = [
		'Le saviez-vous ? (Se lancer)',
		'Ressources humaines (Emplois)',
		'E-commerce (Immobilier, annonces, courses)',
		'Appels de fonds (Financer)',
		"Opportunité d'affaire (Distributeur, business plan)",
		'Entreprises et marchés',
		'Offres financières (Conseil, trésorerie)'
	];
</script>

<svelte:head>
	<title>Paramètres — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Paramètres du site" sousTitre="Coordonnées, modules, montants et textes affichés sur le site." fil={[{ href: '/gestion/parametres', label: 'Paramètres' }]} />

<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
	<Formulaire {form}>
		{#snippet children({ envoi })}
			<div class="space-y-6">
				<fieldset class="carte space-y-5 p-5">
					<legend class="text-lg font-bold">Identité et coordonnées</legend>
					<Saisie label="Nom du site" requis {...champ(form, 'nom_site', p.nom_site)} />
					<Saisie label="Adresse" {...champ(form, 'adresse', p.adresse)} />
					<div class="grid gap-5 sm:grid-cols-3">
						<Saisie label="Téléphone 1" type="tel" inputmode="tel" aide="Aussi numéro Mobile Money affiché au paiement." {...champ(form, 'telephone_1', p.telephone_1)} />
						<Saisie label="Téléphone 2" type="tel" inputmode="tel" {...champ(form, 'telephone_2', p.telephone_2)} />
						<Saisie label="WhatsApp" type="tel" inputmode="tel" aide="Bouton « Une question ? » et liens de contact." {...champ(form, 'whatsapp', p.whatsapp)} />
					</div>
					<Saisie label="E-mail" type="email" {...champ(form, 'email', p.email)} />
				</fieldset>

				<fieldset class="carte space-y-4 p-5">
					<legend class="text-lg font-bold">Modules à risque réglementaire</legend>
					<p class="flex gap-2 rounded-xl bg-soleil-100 p-3 text-[15px]">
						<TriangleAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
						Décision du porteur de projet après avis juridique (ADR-0009). Un module désactivé disparaît de la navigation et affiche une page
						explicative ; aucune donnée n'est supprimée.
					</p>
					<Case name="module_epargne_actif" checked={!!valeur(form, 'module_epargne_actif', p.module_epargne_actif)}>
						<strong>Épargne solidaire et carte de pointage</strong> — dons, placements entre membres (risque : collecte d'épargne, COBAC)
					</Case>
					<Case name="module_sante_actif" checked={!!valeur(form, 'module_sante_actif', p.module_sante_actif)}>
						<strong>Fiches bien-être</strong> — produits conseillés par besoin (risque : allégations de santé)
					</Case>
				</fieldset>

				<fieldset class="carte space-y-5 p-5">
					<legend class="text-lg font-bold">Montants</legend>
					<div class="grid gap-5 sm:grid-cols-3">
						<Saisie label="Placement minimum" type="number" min="0" suffixe="FCFA" {...champ(form, 'montant_minimum_placement', p.montant_minimum_placement)} />
						<Saisie label="Montant minimum d'une course" type="number" min="0" suffixe="FCFA" {...champ(form, 'montant_minimum_course', p.montant_minimum_course)} />
						<Saisie label="Commission d'une course" type="number" min="0" suffixe="FCFA" {...champ(form, 'commission_course', p.commission_course)} />
					</div>
					<Zone label="Conditions du service de courses" lignes={4} {...champ(form, 'conditions_course', p.conditions_course)} />
				</fieldset>

				<fieldset class="carte space-y-5 p-5">
					<legend class="text-lg font-bold">Textes</legend>
					<Zone label="Aide « Comment ça marche ? »" lignes={6} aide="Les sauts de ligne sont conservés." {...champ(form, 'texte_aide', p.texte_aide)} />
					{#each sections as s, i (s)}
						{@const nom = `description_section_${i + 1}`}
						<Zone label="Présentation — {s}" lignes={2} {...champ(form, nom, textes[nom])} />
					{/each}
				</fieldset>

				<div class="sticky bottom-0 -mx-4 flex gap-3 border-t border-fleuve-900/5 bg-creme/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
					<Bouton type="submit" taille="lg" chargement={envoi}>Enregistrer les paramètres</Bouton>
				</div>
			</div>
		{/snippet}
	</Formulaire>
</div>
