<script lang="ts">
	/** Filtres de la liste immobilière (F-S3-10) : recherche toujours visible, critères repliables. */
	import { page } from '$app/state';
	import Search from '@lucide/svelte/icons/search';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { Enums, Ville } from '$lib/types';

	let { filtres: f, villes }: { filtres: Record<string, string>; villes: Ville[] } = $props();

	const avances = ['transaction', 'type_bien', 'ville_id', 'quartier_id', 'chambres', 'pieces_min', 'surface_min', 'surface_max', 'prix_min', 'prix_max'];
	const actifs = $derived(avances.filter((k) => f[k]).length);
	const typesBien = $derived(((page.data.enums as Enums | undefined)?.TypeBien ?? []).filter((o) => o.value !== 0));
	const quartiers = $derived(f.ville_id ? villes.filter((v) => String(v.id) === f.ville_id) : villes.filter((v) => v.quartiers.length));
	const efface = $derived.by(() => {
		const u = new URLSearchParams();
		if (f.type) u.set('type', f.type);
		if (f.miens) u.set('miens', f.miens);
		const s = u.toString();
		return `/immobilier${s ? `?${s}` : ''}`;
	});
</script>

<form method="GET" class="carte mb-6 space-y-3 p-4" data-sveltekit-keepfocus data-sveltekit-noscroll>
	{#if f.type}<input type="hidden" name="type" value={f.type} />{/if}
	{#if f.miens}<input type="hidden" name="miens" value={f.miens} />{/if}
	<div class="flex gap-2">
		<div class="relative flex-1">
			<label for="q-immo" class="sr-only">Rechercher un bien</label>
			<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
			<input id="q-immo" name="q" type="search" value={f.q} placeholder="Quartier, rue, mot-clé, référence…" class="pl-10" />
		</div>
		<Bouton type="submit" variante="fleuve">Chercher</Bouton>
	</div>

	<details open={actifs > 0} class="group">
		<summary class="flex min-h-12 cursor-pointer list-none items-center gap-2 font-semibold text-fleuve-700">
			<SlidersHorizontal class="size-5" aria-hidden="true" />Plus de critères{#if actifs}&nbsp;({actifs}){/if}
		</summary>
		<div class="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<label for="f-transaction" class="mb-1.5 block text-[15px] font-semibold">Transaction</label>
				<select id="f-transaction" name="transaction">
					<option value="">Location ou vente</option>
					<option value="1" selected={f.transaction === '1'}>Location</option>
					<option value="2" selected={f.transaction === '2'}>Vente</option>
				</select>
			</div>
			<div>
				<label for="f-type-bien" class="mb-1.5 block text-[15px] font-semibold">Type de bien</label>
				<select id="f-type-bien" name="type_bien">
					<option value="">Tous les biens</option>
					{#each typesBien as t (t.value)}<option value={t.value} selected={String(t.value) === f.type_bien}>{t.label}</option>{/each}
				</select>
			</div>
			<div>
				<label for="f-ville" class="mb-1.5 block text-[15px] font-semibold">Ville</label>
				<select id="f-ville" name="ville_id">
					<option value="">Toutes les villes</option>
					{#each villes as v (v.id)}<option value={v.id} selected={String(v.id) === f.ville_id}>{v.nom}</option>{/each}
				</select>
			</div>
			<div>
				<label for="f-quartier" class="mb-1.5 block text-[15px] font-semibold">Quartier</label>
				<select id="f-quartier" name="quartier_id">
					<option value="">Tous les quartiers</option>
					{#each quartiers as v (v.id)}
						<optgroup label={v.nom.toUpperCase()}>
							{#each v.quartiers as q (q.id)}<option value={q.id} selected={String(q.id) === f.quartier_id}>{q.nom}</option>{/each}
						</optgroup>
					{/each}
				</select>
			</div>
			<div>
				<label for="f-chambres" class="mb-1.5 block text-[15px] font-semibold">Chambres</label>
				<select id="f-chambres" name="chambres">
					<option value="">Indifférent</option>
					{#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}<option value={n} selected={String(n) === f.chambres}>{n}</option>{/each}
				</select>
			</div>
			<div>
				<label for="f-pieces" class="mb-1.5 block text-[15px] font-semibold">Pièces (minimum)</label>
				<input id="f-pieces" name="pieces_min" type="number" inputmode="numeric" min="0" max="100" value={f.pieces_min} />
			</div>
			<fieldset class="sm:col-span-2">
				<legend class="mb-1.5 text-[15px] font-semibold">Surface (m²)</legend>
				<div class="grid grid-cols-2 gap-2">
					<label><span class="sr-only">Surface minimum</span><input name="surface_min" type="number" inputmode="numeric" min="0" placeholder="Min." value={f.surface_min} /></label>
					<label><span class="sr-only">Surface maximum</span><input name="surface_max" type="number" inputmode="numeric" min="0" placeholder="Max." value={f.surface_max} /></label>
				</div>
			</fieldset>
			<fieldset class="sm:col-span-2">
				<legend class="mb-1.5 text-[15px] font-semibold">Prix (FCFA)</legend>
				<div class="grid grid-cols-2 gap-2">
					<label><span class="sr-only">Prix minimum</span><input name="prix_min" type="number" inputmode="numeric" min="0" placeholder="Min." value={f.prix_min} /></label>
					<label><span class="sr-only">Prix maximum</span><input name="prix_max" type="number" inputmode="numeric" min="0" placeholder="Max." value={f.prix_max} /></label>
				</div>
			</fieldset>
			<div class="sm:col-span-2">
				<label for="f-tri" class="mb-1.5 block text-[15px] font-semibold">Trier par</label>
				<select id="f-tri" name="tri">
					<option value="">Prix croissant</option>
					<option value="prix_desc" selected={f.tri === 'prix_desc'}>Prix décroissant</option>
					<option value="recent" selected={f.tri === 'recent'}>Les plus récents</option>
					<option value="visites" selected={f.tri === 'visites'}>Les plus consultés</option>
				</select>
			</div>
			<div class="flex flex-wrap items-end gap-2 sm:col-span-2">
				<Bouton type="submit" variante="fleuve">Appliquer</Bouton>
				{#if actifs || f.q}<Bouton href={efface} variante="fantome">Effacer les filtres</Bouton>{/if}
			</div>
		</div>
	</details>
</form>
