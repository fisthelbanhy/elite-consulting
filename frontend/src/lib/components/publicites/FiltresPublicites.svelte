<script lang="ts">
	/** Formulaire de tri des publicités (F-ADM-37) : demandeur, entreprise, plages de dates, vues, texte. */
	import Search from '@lucide/svelte/icons/search';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { ETATS_PUBLICITE, type ChoixPublicite, type FiltresPublicites } from '$lib/types/publicites';

	let { filtres: f, choix }: { filtres: FiltresPublicites; choix: ChoixPublicite } = $props();
	const avances = $derived(!!(f.debut_du || f.debut_au || f.fin_du || f.fin_au || f.vues_min || f.vues_max));
</script>

<form method="GET" class="carte space-y-4 p-4" data-sveltekit-keepfocus>
	<input type="hidden" name="vue" value={f.vue} />
	<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
		<div class="lg:col-span-2">
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Texte ou référence</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} class="pl-10" />
			</div>
		</div>
		<div>
			<label for="demandeur_id" class="mb-1.5 block text-[15px] font-semibold">Demandeur</label>
			<select id="demandeur_id" name="demandeur_id">
				<option value="">Tous</option>
				{#each choix.membres as o (o.value)}<option value={o.value} selected={String(o.value) === f.demandeur_id}>{o.label}</option>{/each}
			</select>
		</div>
		<div>
			<label for="entreprise_id" class="mb-1.5 block text-[15px] font-semibold">Entreprise</label>
			<select id="entreprise_id" name="entreprise_id">
				<option value="">Toutes</option>
				{#each choix.entreprises as o (o.value)}<option value={o.value} selected={String(o.value) === f.entreprise_id}>{o.label}</option>{/each}
			</select>
		</div>
	</div>

	<details open={avances}>
		<summary class="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-fleuve-700">
			<SlidersHorizontal class="size-4" aria-hidden="true" />Dates et nombre de vues
		</summary>
		<div class="mt-3 grid gap-4 md:grid-cols-3">
			<fieldset class="space-y-2">
				<legend class="text-[15px] font-semibold">Début de diffusion entre</legend>
				<div class="grid grid-cols-2 gap-2">
					<input type="date" name="debut_du" value={f.debut_du} aria-label="Début de diffusion : du" />
					<input type="date" name="debut_au" value={f.debut_au} aria-label="Début de diffusion : au" />
				</div>
			</fieldset>
			<fieldset class="space-y-2">
				<legend class="text-[15px] font-semibold">Fin de diffusion entre</legend>
				<div class="grid grid-cols-2 gap-2">
					<input type="date" name="fin_du" value={f.fin_du} aria-label="Fin de diffusion : du" />
					<input type="date" name="fin_au" value={f.fin_au} aria-label="Fin de diffusion : au" />
				</div>
			</fieldset>
			<fieldset class="space-y-2">
				<legend class="text-[15px] font-semibold">Nombre de vues entre</legend>
				<div class="grid grid-cols-2 gap-2">
					<input type="number" min="0" inputmode="numeric" name="vues_min" value={f.vues_min} aria-label="Vues minimum" />
					<input type="number" min="0" inputmode="numeric" name="vues_max" value={f.vues_max} aria-label="Vues maximum" />
				</div>
			</fieldset>
		</div>
	</details>

	<div class="flex flex-wrap items-end gap-4">
		<div>
			<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat" name="etat">
				<option value="">En attente et actives</option>
				{#each Object.entries(ETATS_PUBLICITE) as [v, l] (v)}<option value={v} selected={v === f.etat}>{l}</option>{/each}
			</select>
		</div>
		<label class="flex min-h-12 items-center gap-3 text-[15px]">
			<input type="checkbox" name="en_diffusion" value="1" checked={f.en_diffusion} />
			En diffusion aujourd'hui
		</label>
		<Bouton type="submit" variante="fleuve" class="ml-auto">Filtrer</Bouton>
		<Bouton href="/gestion/publicites?vue={f.vue}" variante="fantome">Effacer</Bouton>
	</div>
</form>
