<script lang="ts">
	/**
	 * Formulaire du business plan en 6 étapes (25 questions). Sans JavaScript, toutes les étapes sont
	 * affichées ; avec JavaScript, une étape à la fois. « Sauvegarder » est disponible à chaque étape
	 * (brouillon), « Envoyer » à la dernière (soumis à la frangine). Pas d'attribut `required` : une
	 * étape masquée bloquerait l'envoi ; les règles sont vérifiées par l'API (messages par champ).
	 */
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import { tick } from 'svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { ETAPES_BP, LIBELLES, type ChampBP } from './questions';
	import { champ } from '$lib/forms';
	import type { BusinessPlanDetail } from '$lib/types/business-plan';

	type Retour = { cle?: string; message?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let { form, initial, envoye = false }: { form: Retour; initial: BusinessPlanDetail | null; envoye?: boolean } = $props();

	let js = $state(false);
	let etape = $state(0);
	let haut = $state<HTMLElement>();
	$effect(() => {
		js = true;
	});
	// Après une erreur, on affiche l'étape du premier champ signalé
	$effect(() => {
		const champs = Object.keys(form?.champs ?? {});
		if (!champs.length) return;
		const i = ETAPES_BP.findIndex((e) => e.champs.some((c) => champs.includes(c)));
		if (i >= 0) etape = i;
	});

	async function aller(i: number) {
		etape = Math.max(0, Math.min(ETAPES_BP.length - 1, i));
		await tick();
		haut?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		haut?.querySelector<HTMLElement>('legend')?.focus();
	}
	const derniere = $derived(etape === ETAPES_BP.length - 1);
	const valeurInitiale = (c: ChampBP) => (initial ? initial[c] : c === 'niveau_realisation' ? 0 : '');
</script>

<div bind:this={haut} class="scroll-mt-24">
	{#if js}
		<ol class="mb-6 grid grid-cols-6 gap-1.5" aria-label="Étapes du business plan">
			{#each ETAPES_BP as e, i (e.titre)}
				<li>
					<button
						type="button"
						onclick={() => aller(i)}
						aria-current={i === etape ? 'step' : undefined}
						class="flex min-h-12 w-full flex-col items-center justify-center rounded-lg px-1 text-xs font-semibold {i === etape
							? 'bg-fleuve-700 text-white'
							: i < etape
								? 'bg-foret-50 text-foret-700'
								: 'bg-sable/70 text-ardoise'}"
					>
						<span class="text-sm">{i + 1}</span><span class="hidden sm:block">{e.titre}</span>
						<span class="sr-only sm:hidden">{e.titre}</span>
					</button>
				</li>
			{/each}
		</ol>
	{/if}

	<Formulaire {form}>
		{#snippet children({ envoi })}
			<div class="space-y-6">
				{#each ETAPES_BP as e, i (e.titre)}
					<fieldset class="carte space-y-5 p-5 sm:p-7" hidden={js && i !== etape}>
						<legend class="sr-only" tabindex="-1">Étape {i + 1} sur {ETAPES_BP.length} : {e.titre}</legend>
						<div>
							<p class="text-sm font-semibold text-laterite-600">Étape {i + 1} sur {ETAPES_BP.length}</p>
							<h2 class="text-2xl font-bold">{e.titre}</h2>
							<p class="mt-1 text-ardoise">{e.aide}</p>
						</div>
						{#each e.champs as c (c)}
							{#if c === 'type_activite'}
								<Saisie label="{LIBELLES[c]} (obligatoire)" maxlength="120" aide="5 caractères minimum. Ex. : restauration, agriculture, couture…" {...champ(form, c, valeurInitiale(c))} />
							{:else if c === 'niveau_realisation'}
								<Saisie label={LIBELLES[c]} type="number" inputmode="numeric" min="0" max="100" suffixe="%" class="max-w-xs" {...champ(form, c, valeurInitiale(c))} />
							{:else}
								<Zone
									label={c === 'description_projet' ? `${LIBELLES[c]} (obligatoire)` : LIBELLES[c]}
									lignes={c === 'description_projet' ? 6 : 3}
									aide={c === 'description_projet' ? '10 caractères minimum.' : undefined}
									{...champ(form, c, valeurInitiale(c))}
								/>
							{/if}
						{/each}
					</fieldset>
				{/each}

				<!-- « Sauvegarder » est le premier bouton d'envoi : c'est lui que déclenche la touche Entrée -->
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="order-2 flex flex-wrap gap-3">
						<Bouton type="submit" name="action" value="sauvegarder" variante="secondaire" chargement={envoi}>
							<Save class="size-5" aria-hidden="true" />Sauvegarder
						</Bouton>
						{#if !js || derniere}
							<Bouton type="submit" name="action" value="envoyer" chargement={envoi}>
								<Send class="size-5" aria-hidden="true" />{envoye ? 'Envoyer la mise à jour' : 'Envoyer à ma frangine'}
							</Bouton>
						{:else}
							<Bouton variante="fleuve" onclick={() => aller(etape + 1)}>Suivant<ArrowRight class="size-5" aria-hidden="true" /></Bouton>
						{/if}
					</div>
					{#if js && etape > 0}
						<Bouton variante="fantome" class="order-1" onclick={() => aller(etape - 1)}><ArrowLeft class="size-5" aria-hidden="true" />Précédent</Bouton>
					{:else}
						<span class="order-1"></span>
					{/if}
				</div>
			</div>
		{/snippet}
	</Formulaire>
</div>
