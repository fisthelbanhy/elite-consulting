<script lang="ts">
	/**
	 * Étape 4 : liste de 25 noms (F-S5-25/26). Affichage progressif (5 lignes de plus à la demande)
	 * pour rester lisible sur mobile ; seuls les noms de plus de 5 caractères sont enregistrés.
	 */
	import Plus from '@lucide/svelte/icons/plus';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import TexteBloc from './TexteBloc.svelte';
	import { INTRODUCTIONS } from './contenus';
	import { champ, valeur } from '$lib/forms';
	import type { SouscriptionDetail } from '$lib/types/distributeur';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let { souscription: s, form }: { souscription: SouscriptionDetail | null; form: Retour } = $props();

	const MAX = 25;
	const existants = $derived(s?.prospects ?? []);
	const remplis = $derived.by(() => {
		let n = existants.length;
		for (let i = MAX; i > n; i--) if (valeur(form, `prospect_${i}_nom`, '')) return i;
		return n;
	});
	let supplement = $state(0);
	const visibles = $derived(Math.min(MAX, Math.max(5, remplis + 3) + supplement));
</script>

<TexteBloc bloc={INTRODUCTIONS[4]} />

<p class="text-sm text-ardoise">Indiquez au moins le nom et le prénom (6 caractères minimum) ; les autres informations sont facultatives.</p>

<ol class="space-y-3">
	{#each Array.from({ length: visibles }, (_, k) => k + 1) as i (i)}
		{@const p = existants[i - 1]}
		<li>
			<fieldset class="rounded-xl border border-fleuve-100 bg-white p-4">
				<legend class="px-1 text-sm font-semibold text-fleuve-700">Contact {i}</legend>
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Saisie label="Nom - Prénom" maxlength="60" autocomplete="off" {...champ(form, `prospect_${i}_nom`, p?.nom_prenom)} />
					<Saisie label="Téléphone" type="tel" inputmode="tel" maxlength="20" autocomplete="off" {...champ(form, `prospect_${i}_tel`, p?.telephone)} />
					<Saisie label="E-mail" type="email" maxlength="120" autocomplete="off" {...champ(form, `prospect_${i}_email`, p?.email)} />
					<Saisie label="Commentaire" maxlength="120" autocomplete="off" {...champ(form, `prospect_${i}_commentaire`, p?.commentaire)} />
				</div>
			</fieldset>
		</li>
	{/each}
</ol>

{#if visibles < MAX}
	<button
		type="button"
		onclick={() => (supplement += 5)}
		class="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 ring-inset hover:bg-fleuve-50"
	>
		<Plus class="size-5" aria-hidden="true" />Ajouter 5 lignes ({visibles} / {MAX})
	</button>
{/if}

<Saisie
	label="Dans les tout prochains jours, il vous faudra rallonger votre liste de noms. Fixez-vous une date :"
	type="date"
	class="max-w-xs"
	{...champ(form, 'date_limite_complement', s?.date_limite_complement)}
/>
