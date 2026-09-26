<script lang="ts">
	/**
	 * Questionnaire Découverte de soi.
	 * - mode `etapes` (membre, mobile) : une étape visible à la fois ; chaque bouton de navigation
	 *   enregistre la fiche puis affiche l'étape demandée (`etape_suivante`), sans JavaScript aussi.
	 *   Les étapes masquées restent dans le formulaire (attribut `hidden`) : tout est envoyé.
	 * - mode `complet` (gestionnaire) : toutes les questions sur une page.
	 */
	import { tick } from 'svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import ChampQuestion from './ChampQuestion.svelte';
	import { ETAPES_FICHE } from './questions';
	import { champ } from '$lib/forms';
	import type { FicheDetail } from '$lib/types/decouverte';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string; valeurs?: Record<string, unknown> } | null | undefined;

	let {
		form,
		fiche,
		etape = 1,
		mode = 'etapes',
		action = '?/enregistrer',
		libelleFin = 'Enregistrer ma fiche'
	}: {
		form: Retour;
		fiche: FicheDetail | null;
		etape?: number;
		mode?: 'etapes' | 'complet';
		action?: string;
		libelleFin?: string;
	} = $props();

	const total = ETAPES_FICHE.length;
	const retour = $derived(form?.cle === 'fiche' ? form : null);
	// Une erreur renvoyée par l'API s'affiche sur l'étape qui contient le champ concerné
	const etapeErreur = $derived.by(() => {
		const champs = Object.keys(retour?.champs ?? {});
		const i = ETAPES_FICHE.findIndex((e) => e.questions.some((q) => champs.includes(q.champ)));
		return i >= 0 ? i + 1 : null;
	});
	const courante = $derived(Math.min(Math.max(etapeErreur ?? etape, 1), total));
	const valeurDe = (nom: string) => champ(retour, nom, fiche?.[nom as keyof FicheDetail], 'fiche');

	let titres: HTMLElement[] = $state([]);
	let premier = true;
	$effect(() => {
		const i = courante;
		if (premier) {
			premier = false;
			return;
		}
		tick().then(() => titres[i - 1]?.focus());
	});
</script>

<Formulaire {action} form={retour} cle="fiche">
	{#snippet children({ envoi })}
		{#if mode === 'etapes'}
			<!-- Bouton par défaut (touche Entrée) : « continuer », placé avant la navigation -->
			<button type="submit" name="etape_suivante" value={courante < total ? courante + 1 : 'fin'} class="sr-only" tabindex="-1" aria-hidden="true">Continuer</button>
			<div class="mb-6">
				<p class="mb-2 flex justify-between text-[15px] font-semibold text-ardoise">
					<span>Étape {courante} sur {total}</span><span>{ETAPES_FICHE[courante - 1].titre}</span>
				</p>
				<Jauge valeur={courante} max={total} couleur="laterite" label="Progression du questionnaire" />
				<nav aria-label="Étapes du questionnaire" class="mt-4 overflow-x-auto">
					<ol class="flex min-w-max gap-2">
						{#each ETAPES_FICHE as e, i (e.titre)}
							<li>
								<button
									type="submit"
									name="etape_suivante"
									value={i + 1}
									aria-current={i + 1 === courante ? 'step' : undefined}
									class="min-h-11 rounded-full px-3.5 text-sm font-semibold {i + 1 === courante
										? 'bg-fleuve-700 text-white'
										: 'bg-white text-fleuve-700 ring-1 ring-fleuve-100 hover:bg-fleuve-50'}"
								>
									{i + 1}. {e.titre}
								</button>
							</li>
						{/each}
					</ol>
				</nav>
			</div>
		{/if}

		{#each ETAPES_FICHE as e, i (e.titre)}
			<fieldset class="carte mb-6 space-y-6 p-6" hidden={mode === 'etapes' && i + 1 !== courante} aria-labelledby="titre-etape-{i + 1}">
				<div>
					<h2 id="titre-etape-{i + 1}" class="text-xl font-bold" tabindex="-1" bind:this={titres[i]}>{e.titre}</h2>
					<p class="mt-1 text-ardoise">{e.intro}</p>
				</div>
				{#each e.questions as q (q.champ)}
					{@const c = valeurDe(q.champ)}
					<ChampQuestion question={q} valeur={c.value} erreur={c.erreur} />
				{/each}
			</fieldset>
		{/each}

		<div class="flex flex-wrap items-center gap-3">
			{#if mode === 'etapes' && courante < total}
				<Bouton type="submit" name="etape_suivante" value={courante + 1} taille="lg" chargement={envoi}>
					Enregistrer et continuer <ArrowRight class="size-5" aria-hidden="true" />
				</Bouton>
			{:else}
				<Bouton type="submit" name="etape_suivante" value="fin" taille="lg" chargement={envoi}>
					<Check class="size-5" aria-hidden="true" />{libelleFin}
				</Bouton>
			{/if}
			{#if mode === 'etapes' && courante > 1}
				<Bouton type="submit" name="etape_suivante" value={courante - 1} variante="fantome" taille="lg">
					<ArrowLeft class="size-5" aria-hidden="true" />Étape précédente
				</Bouton>
			{/if}
			{#if mode === 'etapes' && courante < total}
				<Bouton type="submit" name="etape_suivante" value="fin" variante="fantome">Enregistrer et finir plus tard</Bouton>
			{/if}
		</div>
	{/snippet}
</Formulaire>
