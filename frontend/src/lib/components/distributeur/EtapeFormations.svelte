<script lang="ts">
	/** Étape 5 : les 4 formations fixes (POA, Journée de succès, Formation animateur, Formation manager). */
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import TexteBloc from './TexteBloc.svelte';
	import { INTRODUCTIONS, PRESTATIONS } from './contenus';
	import { champ } from '$lib/forms';
	import type { SouscriptionDetail } from '$lib/types/distributeur';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let { souscription: s, form }: { souscription: SouscriptionDetail | null; form: Retour } = $props();

	const formation = (p: number) => s?.formations?.find((f) => f.prestation === p);
</script>

<TexteBloc bloc={INTRODUCTIONS[5]} />

<div class="space-y-3">
	{#each PRESTATIONS as p (p.value)}
		{@const f = formation(p.value)}
		<fieldset class="rounded-xl border border-fleuve-100 bg-white p-4">
			<legend class="px-1 font-semibold text-fleuve-800">{p.label}</legend>
			<div class="grid gap-3 sm:grid-cols-[10rem_1fr_10rem]">
				<Saisie label="Date" type="date" {...champ(form, `formation_${p.value}_date`, f?.date)} />
				<Saisie label="Lieu" maxlength="80" {...champ(form, `formation_${p.value}_lieu`, f?.lieu)} />
				<Saisie label="Heure" maxlength="30" placeholder="Ex. 18 h 30" {...champ(form, `formation_${p.value}_heure`, f?.heure)} />
			</div>
		</fieldset>
	{/each}
</div>
