<script lang="ts">
	/** Filtres des courses (F-S3-48, correctifs : chaque borne s'applique seule, « Livrée » filtrable). */
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Bouton from '$lib/components/ui/Bouton.svelte';

	let { filtres: f, vue, boutique = false, gestion = false }: { filtres: Record<string, string>; vue: string; boutique?: boolean; gestion?: boolean } = $props();
	const actifs = $derived(Object.entries(f).filter(([k, x]) => x && k !== 'role').length);
	const intervalles = [
		['commande', 'Date de commande'],
		['achat', 'Date des achats'],
		['livraison', 'Date de livraison']
	] as const;
</script>

<form method="GET" class="carte mb-6 p-4" data-sveltekit-keepfocus data-sveltekit-noscroll>
	{#if f.role}<input type="hidden" name="role" value={f.role} />{/if}
	<details open={actifs > 0}>
		<summary class="flex min-h-12 cursor-pointer list-none items-center gap-2 font-semibold text-fleuve-700">
			<SlidersHorizontal class="size-5" aria-hidden="true" />Filtrer les courses{#if actifs}&nbsp;({actifs}){/if}
		</summary>
		<div class="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-3">
			{#each intervalles as [cle, libelle] (cle)}
				<fieldset>
					<legend class="mb-1.5 text-[15px] font-semibold">{libelle}</legend>
					<div class="grid grid-cols-2 gap-2">
						<label><span class="block text-sm text-ardoise">Du</span><input type="date" name="{cle}_min" value={f[`${cle}_min`]} /></label>
						<label><span class="block text-sm text-ardoise">Au</span><input type="date" name="{cle}_max" value={f[`${cle}_max`]} /></label>
					</div>
				</fieldset>
			{/each}
			<div>
				<label for="f-etat-course" class="mb-1.5 block text-[15px] font-semibold">État de la course</label>
				<select id="f-etat-course" name="etat_course">
					<option value="">Tous les états</option>
					<option value="1" selected={f.etat_course === '1'}>En attente</option>
					<option value="3" selected={f.etat_course === '3'}>Achats effectués</option>
					<option value="4" selected={f.etat_course === '4'}>Livrée</option>
					<option value="2" selected={f.etat_course === '2'}>Annulée</option>
				</select>
			</div>
			<div>
				<label for="f-q-course" class="mb-1.5 block text-[15px] font-semibold">Référence ou lieu</label>
				<input id="f-q-course" name="q" type="search" value={f.q} placeholder="CRS…, marché, quartier…" />
			</div>
			{#if gestion || boutique}
				<div>
					<label for="f-vue" class="mb-1.5 block text-[15px] font-semibold">Affichage</label>
					<select id="f-vue" name="vue">
						<option value="">Synthèse (une carte par course)</option>
						<option value="general" selected={vue === 'general'}>Général (une ligne par article)</option>
					</select>
				</div>
			{/if}
			<div class="flex items-end gap-2">
				<Bouton type="submit" variante="fleuve">Appliquer</Bouton>
				{#if actifs}<Bouton href="/courses{f.role ? `?role=${f.role}` : ''}" variante="fantome">Effacer</Bouton>{/if}
			</div>
		</div>
	</details>
</form>
