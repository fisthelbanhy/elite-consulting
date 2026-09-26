<script lang="ts">
	/**
	 * Commande de courses (F-S3-51 à F-S3-63) : articles (catalogue de la boutique choisie et/ou saisie
	 * libre), lieu et date d'achat, date/heure et lieu de livraison. Validation en 2 temps pour le
	 * membre (« Vérifier » puis « Confirmer ») ; le gestionnaire enregistre directement.
	 */
	import { page } from '$app/state';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import { champ } from '$lib/forms';
	import { fcfa } from '$lib/format';
	import type { ArticleCatalogue, Boutique, CourseDetail, LigneSaisie, Recapitulatif } from '$lib/types/courses';
	import ChoixCatalogue from './ChoixCatalogue.svelte';
	import LignesCourse from './LignesCourse.svelte';
	import RecapCourse from './RecapCourse.svelte';

	type Retour = {
		cle?: string;
		message?: string;
		champs?: Record<string, string>;
		valeurs?: Record<string, unknown>;
		recap?: Recapitulatif;
	} | null | undefined;

	let {
		form,
		boutique = null,
		catalogue = [],
		initial = null,
		gestion = false,
		aujourdhui,
		lienAnnuler = '/courses'
	}: {
		form: Retour;
		boutique?: Boutique | null;
		catalogue?: ArticleCatalogue[];
		initial?: CourseDetail | null;
		gestion?: boolean;
		aujourdhui: string;
		lienAnnuler?: string;
	} = $props();

	const retour = $derived(form?.cle === 'course' ? form : null);
	const v = (nom: string, defaut: unknown = '') => champ(retour, nom, defaut, 'course');

	function lignesInitiales(): LigneSaisie[] {
		const saisies = retour?.valeurs?.lignes as LigneSaisie[] | undefined;
		if (saisies?.length) return saisies.map((l) => ({ ...l, quantite: l.quantite || (l.nom_article ? 0 : 1) }));
		const existantes = (initial?.lignes ?? [])
			.filter((l) => !l.article_catalogue_id)
			.map((l) => ({ nom_article: l.nom_article, prix_plafond: l.prix_plafond, quantite: l.quantite, observation: l.observation }));
		if (existantes.length) return existantes;
		return Array.from({ length: 3 }, () => ({ nom_article: '', prix_plafond: '', quantite: 1, observation: '' }));
	}
	function quantitesInitiales(): Record<string, number | string> {
		const saisies = retour?.valeurs?.catalogue as Record<string, number> | undefined;
		if (saisies) return { ...saisies };
		return Object.fromEntries((initial?.lignes ?? []).filter((l) => l.article_catalogue_id).map((l) => [String(l.article_catalogue_id), l.quantite]));
	}

	let lignes = $state(lignesInitiales());
	let quantites = $state(quantitesInitiales());
	let modifie = $state(false);
	let derniereVerification: Recapitulatif | undefined;
	$effect(() => {
		// Un nouveau récapitulatif du serveur correspond aux valeurs actuelles
		if (retour?.recap && retour.recap !== derniereVerification) {
			derniereVerification = retour.recap;
			modifie = false;
		}
	});
	const recap = $derived(!modifie ? retour?.recap : undefined);

	const livraisonInitiale = initial?.date_livraison ?? '';
	const jourInitial = String(retour?.valeurs?.jour_livraison ?? livraisonInitiale.slice(0, 10));
	const heureInitiale = String(retour?.valeurs?.heure_livraison ?? livraisonInitiale.slice(11, 16));
	const heures = $derived.by(() => {
		const h: string[] = [];
		for (let i = 10; i <= 18; i++) h.push(`${String(i).padStart(2, '0')}:00`, `${String(i).padStart(2, '0')}:30`);
		if (heureInitiale && !h.includes(heureInitiale)) h.push(heureInitiale);
		return h.sort();
	});

	const frais = $derived(initial?.frais_service ?? Number(page.data.parametres?.commission_course ?? 0));
	const minimum = $derived(Number(page.data.parametres?.montant_minimum_course ?? 0));
	const estimation = $derived(
		lignes.reduce((s, l) => s + (l.nom_article ? (Number(l.prix_plafond) || 0) * (Number(l.quantite) || 0) : 0), 0) +
			catalogue.reduce((s, a) => s + a.prix * (Number(quantites[String(a.id)]) || 0), 0)
	);
</script>

<Formulaire action="?/verifier" {form} cle="course">
	{#snippet children({ envoi })}
		<!-- Toute modification après la vérification impose une nouvelle vérification -->
		<div class="space-y-8" oninput={() => (modifie = true)}>
			<input type="hidden" name="boutique_id" value={boutique?.id ?? ''} />

			<fieldset class="carte space-y-4 p-6" id="champ-lignes">
				<legend class="sr-only">Articles à acheter</legend>
				<h2 class="text-xl font-bold">Vos articles</h2>
				{#if retour?.champs?.lignes}<p class="font-medium text-alerte">{retour.champs.lignes}</p>{/if}
				{#if boutique && catalogue.length}
					<div>
						<h3 class="mb-2 text-lg font-bold">Au catalogue de {boutique.pseudonyme}</h3>
						<ChoixCatalogue articles={catalogue} bind:quantites />
					</div>
					<h3 class="pt-2 text-lg font-bold">Autres articles</h3>
				{/if}
				<LignesCourse bind:lignes erreurs={retour?.champs ?? {}} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Achats</legend>
				<h2 class="text-xl font-bold">Les achats</h2>
				<Zone
					label="Lieu d'achat"
					lignes={2}
					requis={!boutique}
					aide={boutique ? `Laissez vide pour acheter chez ${boutique.pseudonyme}.` : 'Marché, magasin, supermarché… (10 caractères minimum)'}
					{...v('lieu_achat', initial?.lieu_achat)}
				/>
				<Saisie label="Date des achats" type="date" min={aujourdhui} requis {...v('date_achat', initial?.date_achat ?? aujourdhui)} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Livraison</legend>
				<h2 class="text-xl font-bold">La livraison</h2>
				<div class="grid gap-5 sm:grid-cols-2" id="champ-date_livraison">
					<div class="space-y-1.5">
						<label for="jour-livraison" class="block text-[15px] font-semibold">Date de livraison<span class="text-laterite-600" aria-hidden="true">&nbsp;*</span></label>
						<input id="jour-livraison" name="jour_livraison" type="date" min={aujourdhui} required value={jourInitial} aria-invalid={retour?.champs?.date_livraison ? 'true' : undefined} aria-describedby="erreur-livraison" />
					</div>
					<div class="space-y-1.5">
						<label for="heure-livraison" class="block text-[15px] font-semibold">Heure<span class="text-laterite-600" aria-hidden="true">&nbsp;*</span></label>
						<select id="heure-livraison" name="heure_livraison" required aria-describedby="erreur-livraison">
							<option value="">Choisir…</option>
							{#each heures as h (h)}<option value={h} selected={h === heureInitiale}>{h.replace(':', ' h ')}</option>{/each}
						</select>
					</div>
				</div>
				<p id="erreur-livraison" class="-mt-3 text-sm {retour?.champs?.date_livraison ? 'font-medium text-alerte' : 'text-ardoise'}">
					{retour?.champs?.date_livraison ?? 'Livraisons de 10 h à 18 h 30, le jour des achats ou après.'}
				</p>
				<Zone label="Lieu de livraison" lignes={2} requis aide="Adresse précise et numéro de téléphone à appeler à la livraison." {...v('lieu_livraison', initial?.lieu_livraison)} />
				<Zone label="Observation" lignes={2} aide="Facultatif : consignes particulières." {...v('observation', initial?.observation)} />
			</fieldset>

			{#if recap}
				<RecapCourse {recap} />
			{:else}
				<section class="carte p-5" aria-live="polite">
					<p class="flex justify-between text-[15px]"><span>Montant estimé des achats</span><strong class="montant">{fcfa(estimation)}</strong></p>
					<p class="flex justify-between text-[15px]"><span>Frais de service</span><strong class="montant">{fcfa(frais)}</strong></p>
					<p class="mt-2 flex justify-between border-t border-fleuve-900/5 pt-2 font-semibold"><span>Net estimé</span><span class="montant">{fcfa(estimation + frais)}</span></p>
					{#if estimation && estimation < minimum}<p class="mt-2 text-sm text-alerte">Le montant des courses ne doit pas être inférieur à {fcfa(minimum)}.</p>{/if}
				</section>
			{/if}

			<div class="flex flex-wrap gap-3">
				{#if gestion}
					<Bouton type="submit" formaction="?/enregistrer" taille="lg" chargement={envoi}>Enregistrer la course</Bouton>
					<Bouton type="submit" variante="secondaire" taille="lg" disabled={envoi}>Vérifier le montant</Bouton>
				{:else if recap}
					<Bouton type="submit" formaction="?/enregistrer" taille="lg" chargement={envoi}>{initial ? 'Enregistrer les modifications' : `Confirmer ma commande — ${fcfa(recap.net_a_payer)}`}</Bouton>
					<Bouton type="submit" variante="secondaire" taille="lg" disabled={envoi}>Recalculer</Bouton>
				{:else}
					<Bouton type="submit" taille="lg" chargement={envoi}>Vérifier ma commande</Bouton>
				{/if}
				<Bouton href={lienAnnuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
