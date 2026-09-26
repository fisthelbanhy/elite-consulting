<script lang="ts">
	/**
	 * Questionnaire d'accompagnement complet (S7-3 à S7-7) : objet (≥ 10 caractères), sections
	 * repliables, progression, et deux boutons toujours accessibles en bas d'écran :
	 * « Sauvegarder » (brouillon) et « Envoyer à mon conseiller » (F-S7-21).
	 */
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import SectionDossier from './SectionDossier.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { DossierDetail, Questionnaire } from '$lib/types/accompagnement';

	let {
		questionnaire: q,
		form,
		initial = null,
		lecture = false
	}: {
		questionnaire: Questionnaire;
		form: Record<string, unknown> | null | undefined;
		initial?: DossierDetail | null;
		lecture?: boolean;
	} = $props();

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	const f = $derived((form as Retour)?.cle === 'dossier' ? (form as Retour) : null);

	const depart = () => {
		const r: Record<string, string> = {};
		for (const s of q.sections)
			for (const g of s.groupes)
				for (const x of g.questions) r[String(x.zone)] = String(valeur(f, `z${x.zone}`, initial?.reponses?.[String(x.zone)] ?? ''));
		return r;
	};
	let reponses = $state(depart());
	const remplies = $derived(Object.values(reponses).filter((v) => v.trim()).length);
	const envoye = $derived(initial !== null && initial.etat !== 1);
</script>

<Formulaire form={f} cle="dossier">
	{#snippet children({ envoi })}
		<div class="space-y-4 {lecture ? '' : 'pb-4'}">
			<div class="carte space-y-4 p-5 sm:p-6">
				{#if lecture}
					<p class="text-sm text-ardoise">Objet du dossier</p>
					<p class="text-lg font-semibold">{initial?.objet}</p>
				{:else}
					<Saisie
						label="Objet du dossier"
						requis
						minlength={10}
						maxlength={250}
						aide="En une phrase : votre projet et le financement recherché (10 caractères minimum)."
						placeholder="Ex. : Extension de ma boulangerie à Moungali, prêt de 15 millions"
						{...champ(f, 'objet', initial?.objet)}
					/>
				{/if}
				<div>
					<p class="mb-1.5 flex justify-between text-sm"><span class="font-semibold">Progression</span><span class="text-ardoise">{remplies} / {q.nombre_questions} questions</span></p>
					<Jauge valeur={remplies} max={q.nombre_questions} label="Questions remplies" couleur="foret" />
				</div>
				{#if !lecture}
					<p class="text-sm text-ardoise">Pas besoin de tout remplir d’un coup : sauvegardez, revenez quand vous voulez. Votre conseiller vous aide à compléter le reste.</p>
				{/if}
			</div>

			{#each q.sections as s, i (s.numero)}
				<SectionDossier section={s} bind:reponses {lecture} ouvert={i === 0} />
			{/each}

			{#if !lecture}
				<div class="sticky bottom-0 z-10 -mx-4 border-t border-fleuve-900/10 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-levee">
					<div class="flex flex-wrap items-center justify-end gap-3">
						<span class="mr-auto hidden text-sm text-ardoise sm:inline">{remplies} / {q.nombre_questions} questions remplies</span>
						{#if envoye}
							<!-- Déjà transmis : le conseiller voit directement la version enregistrée -->
							<Bouton type="submit" name="envoyer" value="0" chargement={envoi}><Save class="size-5" aria-hidden="true" />Enregistrer les modifications</Bouton>
						{:else}
							<Bouton type="submit" name="envoyer" value="0" variante="secondaire" chargement={envoi}><Save class="size-5" aria-hidden="true" />Sauvegarder</Bouton>
							<Bouton type="submit" name="envoyer" value="1" chargement={envoi}><Send class="size-5" aria-hidden="true" />Envoyer à mon conseiller</Bouton>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/snippet}
</Formulaire>
