<script lang="ts">
	/** Formulaire de création / modification d'un appel de fonds (F-S4-11 à F-S4-16). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, erreur, valeur } from '$lib/forms';
	import { fcfa } from '$lib/format';
	import type { Secteur, Ville } from '$lib/types';
	import type { ProjetDetail } from '$lib/types/projets';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string } | null | undefined;

	let {
		form,
		secteurs,
		villes,
		entreprises = [],
		initial,
		libelleBouton = 'Publier mon projet'
	}: {
		form: Retour;
		secteurs: Secteur[];
		villes: Ville[];
		entreprises?: { id: number; nom: string }[];
		initial?: ProjetDetail | null;
		libelleBouton?: string;
	} = $props();

	const f = $derived(form);
	// Valeurs initiales volontairement figées : les champs sont ensuite liés (bind:value) à la saisie
	// svelte-ignore state_referenced_locally
	let devis = $state(String(valeur(form, 'devis_projet', initial?.devis_projet ?? '')));
	// svelte-ignore state_referenced_locally
	let apport = $state(String(valeur(form, 'apport_fond_propre', initial?.apport_fond_propre ?? '')));
	// svelte-ignore state_referenced_locally
	let besoin = $state(String(valeur(form, 'besoin_financement', initial?.besoin_financement ?? '')));
	const nombre = (v: string) => Number(String(v).replace(/\s/g, '')) || 0;
	const besoinMax = $derived(Math.max(0, nombre(devis) - nombre(apport)));
	const incoherent = $derived(nombre(besoin) > 0 && nombre(devis) > 0 && nombre(besoin) > besoinMax);
	const niveaux = Array.from({ length: 11 }, (_, i) => ({ value: i * 10, label: `${i * 10} %` }));
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Le projet</legend>
				<h2 class="text-xl font-bold">Votre projet</h2>
				<Saisie label="Nom du projet" requis maxlength={150} aide="Au moins 11 caractères, un nom qui parle (ex. « Boulangerie de Bacongo »)." {...champ(f, 'nom_projet', initial?.nom_projet)} />
				<Saisie label="Objet du financement" requis maxlength={500} aide="Ce que l'argent va financer, en une phrase (11 caractères minimum)." {...champ(f, 'objet_projet', initial?.objet_projet)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Liste label="Secteur d'activité" requis options={secteurs.map((s) => ({ value: s.id, label: s.libelle }))} {...champ(f, 'secteur_id', initial?.secteur_id)} />
					<Liste label="Ville du projet" requis options={villes.map((v) => ({ value: v.id, label: v.nom }))} {...champ(f, 'ville_id', initial?.ville_id)} />
				</div>
				{#if entreprises.length}
					<Liste label="Entreprise porteuse (facultatif)" vide="Aucune — projet personnel" options={entreprises.map((e) => ({ value: e.id, label: e.nom }))} {...champ(f, 'entreprise_id', initial?.entreprise_id)} />
				{/if}
				<Zone label="Votre activité aujourd'hui" requis lignes={4} aide="Depuis quand, où, avec qui… (plus de 30 caractères)." {...champ(f, 'description_activite', initial?.description_activite)} />
				<Zone label="Le projet à financer" requis lignes={5} aide="Ce que vous allez faire, les résultats attendus (plus de 30 caractères)." {...champ(f, 'description_projet', initial?.description_projet)} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Plan de financement</legend>
				<div>
					<h2 class="text-xl font-bold">Plan de financement</h2>
					<p class="mt-1 text-[15px] text-ardoise">Le besoin ne peut pas dépasser le coût total moins votre apport.</p>
				</div>
				<div class="grid gap-5 sm:grid-cols-3">
					<Saisie label="Coût total (devis)" name="devis_projet" type="number" inputmode="numeric" min="0" step="1" suffixe="FCFA" requis bind:value={devis} erreur={erreur(f, 'devis_projet')} />
					<Saisie label="Votre apport" name="apport_fond_propre" type="number" inputmode="numeric" min="0" step="1" suffixe="FCFA" bind:value={apport} erreur={erreur(f, 'apport_fond_propre')} />
					<Saisie label="Besoin de financement" name="besoin_financement" type="number" inputmode="numeric" min="0" step="1" suffixe="FCFA" requis bind:value={besoin} erreur={erreur(f, 'besoin_financement')} />
				</div>
				<p class="text-sm {incoherent ? 'font-semibold text-alerte' : 'text-ardoise'}" aria-live="polite">
					Besoin maximum : <span class="montant">{fcfa(besoinMax)}</span>{#if incoherent} — votre besoin dépasse ce montant.{/if}
				</p>
				<Liste label="Niveau de réalisation actuel" vide={null} options={niveaux} {...champ(f, 'niveau_realisation', initial?.niveau_realisation ?? 0)} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Promoteur</legend>
				<div>
					<h2 class="text-xl font-bold">Le promoteur</h2>
					<p class="mt-1 text-[15px] text-ardoise">Visible uniquement par vous et la frangine. Les membres intéressés passent par la plateforme.</p>
				</div>
				<Saisie label="Nom du promoteur" requis autocomplete="name" aide="Plus de 5 caractères." {...champ(f, 'nom_promoteur', initial?.nom_promoteur)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" autocomplete="tel" {...champ(f, 'telephone_promoteur', initial?.telephone_promoteur)} />
					<Saisie label="E-mail" type="email" autocomplete="email" {...champ(f, 'email_promoteur', initial?.email_promoteur)} />
				</div>
				<Saisie label="Adresse" aide="Adresse complète (ex. 59 rue Bétou - Moungali - Brazzaville)." {...champ(f, 'adresse_promoteur', initial?.adresse_promoteur)} />
			</fieldset>

			<fieldset class="carte grid gap-5 p-6 sm:grid-cols-2">
				<legend class="sr-only">Documents</legend>
				<Fichier label="Dossier de présentation (PDF)" name="presentation" accept="application/pdf" image={false} actuel={initial?.presentation_url} erreur={f?.champs?.presentation} aide="Business plan, devis, photos… en un seul PDF." />
				<Fichier label="Photo du projet" name="photo" actuel={initial?.photo_url} erreur={f?.champs?.photo} />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/projets/${initial.id}` : '/projets'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
