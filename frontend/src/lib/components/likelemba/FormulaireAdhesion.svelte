<script lang="ts">
	/** Adhésion à un likelemba (F-S4-36 à F-S4-39) : caution, 3 témoins, observation. Le responsable
	 * ou la frangine peuvent inscrire un autre membre et fixer la date d'entrée. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Case from '$lib/components/ui/Case.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { AdhesionDetail, MembreChoix } from '$lib/types/likelemba';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string } | null | undefined;

	let {
		form,
		initial,
		membres = null,
		gerer = false,
		retour,
		libelleBouton = 'Rejoindre le likelemba'
	}: {
		form: Retour;
		initial?: AdhesionDetail | null;
		membres?: MembreChoix[] | null;
		gerer?: boolean;
		retour: string;
		libelleBouton?: string;
	} = $props();

	const temoin = (i: number) => initial?.temoins?.[i - 1];
	const coche = (nom: string, initiale: boolean | undefined) => Boolean(valeur(form, nom, initiale ?? false));
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			{#if gerer && (membres || initial)}
				<fieldset class="carte space-y-5 p-6">
					<legend class="sr-only">Adhérent</legend>
					<h2 class="text-xl font-bold">Adhérent</h2>
					{#if membres && !initial}
						<Liste
							label="Membre à inscrire"
							vide="Moi-même"
							options={membres.map((m) => ({ value: m.id, label: m.pseudonyme ? `${m.nom} (${m.pseudonyme})` : m.nom }))}
							{...champ(form, 'membre_id', '')}
						/>
					{/if}
					<Saisie label="Date d'entrée" type="date" {...champ(form, 'date_entree', initial?.date_entree ?? new Date().toISOString().slice(0, 10))} />
				</fieldset>
			{/if}

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Personne caution</legend>
				<div>
					<h2 class="text-xl font-bold">Personne caution</h2>
					<p class="mt-1 text-[15px] text-ardoise">Elle se porte garante en cas de défaut de cotisation. Visible uniquement par l'adhérent, le responsable et la frangine.</p>
				</div>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Nom et prénom" autocomplete="off" {...champ(form, 'caution_nom', initial?.caution_nom)} />
					<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" {...champ(form, 'caution_telephone', initial?.caution_telephone)} />
					<Saisie label="Pièce d'identité" placeholder="CNI, passeport… et son numéro" {...champ(form, 'caution_piece_identite', initial?.caution_piece_identite)} />
					<Saisie label="Activité" {...champ(form, 'caution_activite', initial?.caution_activite)} />
				</div>
				<Saisie label="Adresse" {...champ(form, 'caution_adresse', initial?.caution_adresse)} />
				<Case name="caution_est_membre" checked={coche('caution_est_membre', initial?.caution_est_membre)}>La caution est membre de La Frangine</Case>
			</fieldset>

			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Témoins</legend>
				<div>
					<h2 class="text-xl font-bold">Témoins</h2>
					<p class="mt-1 text-[15px] text-ardoise">Jusqu'à trois personnes qui vous connaissent bien.</p>
				</div>
				{#each [1, 2, 3] as i (i)}
					<div class="space-y-4 rounded-xl bg-creme p-4">
						<h3 class="text-base font-bold">Témoin {i}</h3>
						<div class="grid gap-4 sm:grid-cols-3">
							<Saisie label="Nom et prénom" {...champ(form, `temoin${i}_nom`, temoin(i)?.nom)} />
							<Saisie label="Téléphone" type="tel" inputmode="tel" {...champ(form, `temoin${i}_telephone`, temoin(i)?.telephone)} />
							<Saisie label="Emploi" {...champ(form, `temoin${i}_emploi`, temoin(i)?.emploi)} />
						</div>
						<Case name="temoin{i}_est_membre" checked={coche(`temoin${i}_est_membre`, temoin(i)?.est_membre)}>Membre de La Frangine</Case>
					</div>
				{/each}
			</fieldset>

			<div class="carte p-6">
				<Zone label="Observation" lignes={3} {...champ(form, 'observation', initial?.observation)} />
			</div>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={retour} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>
