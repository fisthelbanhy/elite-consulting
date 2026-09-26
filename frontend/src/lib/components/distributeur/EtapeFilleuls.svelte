<script lang="ts">
	/** Étape 8 : jusqu'à 3 intéressés (nom, e-mail, adresse, montant, date de présentation). */
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import TexteBloc from './TexteBloc.svelte';
	import { INTRODUCTIONS } from './contenus';
	import { champ } from '$lib/forms';
	import type { SouscriptionDetail } from '$lib/types/distributeur';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let { souscription: s, form }: { souscription: SouscriptionDetail | null; form: Retour } = $props();
</script>

<TexteBloc bloc={INTRODUCTIONS[8]} />

<div class="space-y-3">
	{#each [1, 2, 3] as i (i)}
		{@const f = s?.filleuls?.[i - 1]}
		<fieldset class="rounded-xl border border-fleuve-100 bg-white p-4">
			<legend class="px-1 font-semibold text-fleuve-800">Intéressé·e {i}</legend>
			<div class="grid gap-3 sm:grid-cols-2">
				<Saisie label="Nom - Prénom" maxlength="60" autocomplete="off" {...champ(form, `filleul_${i}_nom`, f?.nom)} />
				<Saisie label="E-mail" type="email" maxlength="120" autocomplete="off" {...champ(form, `filleul_${i}_email`, f?.email)} />
				<Saisie label="Adresse" maxlength="120" autocomplete="off" {...champ(form, `filleul_${i}_adresse`, f?.adresse)} />
				<div class="grid grid-cols-2 gap-3">
					<Saisie label="Montant" type="number" inputmode="numeric" min="0" suffixe="FCFA" {...champ(form, `filleul_${i}_montant`, f?.montant || '')} />
					<Saisie label="Date de présentation" type="date" {...champ(form, `filleul_${i}_date`, f?.date_presentation)} />
				</div>
			</div>
		</fieldset>
	{/each}
</div>
