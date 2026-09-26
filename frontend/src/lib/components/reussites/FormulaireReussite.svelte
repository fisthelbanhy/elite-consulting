<script lang="ts">
	/** Témoignage de réussite : champs du legacy (incl-reussite.php), regroupés en récit. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { Secteur } from '$lib/types';
	import type { ReussiteDetail } from '$lib/types/reussites';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string } | null | undefined;

	let {
		form,
		secteurs,
		initial,
		retour = '',
		libelleBouton = 'Envoyer mon témoignage'
	}: { form: Retour; secteurs: Secteur[]; initial?: ReussiteDetail | null; retour?: string; libelleBouton?: string } = $props();

	const options = $derived(secteurs.map((s) => ({ value: s.id, label: s.libelle })));
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		{#if retour}<input type="hidden" name="retour" value={retour} />{/if}
		<div class="space-y-8">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Votre activité</legend>
				<h2 class="text-xl font-bold">Votre activité</h2>
				<Liste label="Quel est le secteur d'activité ?" requis {options} {...champ(form, 'secteur_id', initial?.secteur_id)} />
				<Zone
					label="Votre projet"
					requis
					lignes={3}
					aide="Ce que vous faites aujourd'hui, en quelques phrases (10 caractères minimum)."
					{...champ(form, 'projet', initial?.projet)}
				/>
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Votre parcours</legend>
				<h2 class="text-xl font-bold">Votre parcours</h2>
				<Zone label="Ce que vous étiez avant" lignes={3} {...champ(form, 'situation_avant', initial?.situation_avant)} />
				<Zone label="Votre vision" lignes={3} {...champ(form, 'vision', initial?.vision)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Votre fonds de démarrage" type="number" min="0" inputmode="numeric" suffixe="FCFA" {...champ(form, 'fond_demarrage', initial?.fond_demarrage || '')} />
					<Saisie label="Besoin réel pour le démarrage" type="number" min="0" inputmode="numeric" suffixe="FCFA" {...champ(form, 'besoin_reel_demarrage', initial?.besoin_reel_demarrage || '')} />
				</div>
				<Zone label="Stratégie mise en place" lignes={3} {...champ(form, 'strategie', initial?.strategie)} />
				<Zone label="Difficultés rencontrées" lignes={3} {...champ(form, 'difficultes', initial?.difficultes)} />
				<Zone label="Déploiement des efforts" lignes={3} aide="Ce que vous avez fait pour tenir et avancer." {...champ(form, 'deploiement_efforts', initial?.deploiement_efforts)} />
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Votre réussite</legend>
				<h2 class="text-xl font-bold">Votre réussite</h2>
				<Zone label="Succès rencontré" lignes={3} aide="Vos clients, vos premiers salariés, ce dont vous êtes fier·e." {...champ(form, 'succes', initial?.succes)} />
				<Zone label="Conseil" lignes={3} aide="Le conseil que vous donneriez à quelqu'un qui se lance." {...champ(form, 'conseil', initial?.conseil)} />
				<Fichier
					label="Une photo de vous ou de votre activité"
					name="photo"
					aide="Facultatif. Elle illustrera votre témoignage."
					actuel={initial?.photo_url}
					erreur={form?.champs?.photo}
				/>
			</fieldset>

			<p class="text-sm text-ardoise">
				Votre témoignage est publié sous votre pseudonyme, après relecture par la frangine. Votre nom et votre numéro ne sont jamais affichés.
			</p>
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/reussites/${initial.id}` : '/reussites'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
