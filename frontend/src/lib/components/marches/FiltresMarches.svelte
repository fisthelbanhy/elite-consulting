<script lang="ts">
	/** Filtres des appels d'offres (F-S6-24) : mots, public/privé, ouverts, montant minimum, tri.
	 * Formulaire GET : les filtres restent dans l'URL. */
	import Search from '@lucide/svelte/icons/search';
	import Bouton from '$lib/components/ui/Bouton.svelte';

	let { filtres }: { filtres: { q: string; type: string; ouverts: string; montant_min: string; tri: string } } = $props();
	const soumettre = (e: Event) => (e.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit();
</script>

<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end" data-sveltekit-keepfocus>
	<div class="sm:col-span-2 lg:col-span-1">
		<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
		<div class="relative">
			<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
			<input id="q" name="q" type="search" value={filtres.q} placeholder="Travaux, fournitures, ministère…" class="pl-10" maxlength="100" />
		</div>
	</div>
	<div>
		<label for="type" class="mb-1.5 block text-[15px] font-semibold">Type</label>
		<select id="type" name="type" onchange={soumettre}>
			<option value="">Publics et privés</option>
			<option value="2" selected={filtres.type === '2'}>Marchés publics</option>
			<option value="1" selected={filtres.type === '1'}>Marchés privés</option>
		</select>
	</div>
	<div>
		<label for="montant_min" class="mb-1.5 block text-[15px] font-semibold">Montant minimum</label>
		<select id="montant_min" name="montant_min" onchange={soumettre}>
			<option value="">Tous montants</option>
			{#each [[1_000_000, '1 million FCFA'], [10_000_000, '10 millions FCFA'], [50_000_000, '50 millions FCFA'], [100_000_000, '100 millions FCFA']] as [v, l] (v)}
				<option value={v} selected={filtres.montant_min === String(v)}>{l}</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="tri" class="mb-1.5 block text-[15px] font-semibold">Trier par</label>
		<select id="tri" name="tri" onchange={soumettre}>
			<option value="">Plus récents</option>
			<option value="cloture" selected={filtres.tri === 'cloture'}>Date limite la plus proche</option>
			<option value="montant" selected={filtres.tri === 'montant'}>Montant le plus élevé</option>
		</select>
	</div>
	<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	<label class="flex min-h-12 cursor-pointer items-center gap-3 sm:col-span-2 lg:col-span-5">
		<input type="checkbox" name="ouverts" value="1" checked={filtres.ouverts === '1'} onchange={soumettre} />
		<span class="text-[15px] font-semibold">Seulement les marchés encore ouverts</span>
	</label>
</form>
