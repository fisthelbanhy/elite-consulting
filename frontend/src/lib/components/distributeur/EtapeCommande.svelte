<script lang="ts">
	/**
	 * Étape 9 : mode de souscription + kit choisi parmi **tous** les produits actifs (ADR-0007 S5b),
	 * valeur de chaque ligne et total recalculés en direct (correctif F-S5-31/32) ; le serveur recalcule
	 * toujours le montant.
	 */
	import Package from '@lucide/svelte/icons/package';
	import Search from '@lucide/svelte/icons/search';
	import Choix from '$lib/components/ui/Choix.svelte';
	import TexteBloc from './TexteBloc.svelte';
	import { INTRODUCTIONS, PLAFOND_CREDIT, SEUIL_MINIMUM } from './contenus';
	import { valeur } from '$lib/forms';
	import { fcfa } from '$lib/format';
	import type { ProduitKit, SouscriptionDetail } from '$lib/types/distributeur';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let { souscription: s, kit, form }: { souscription: SouscriptionDetail | null; kit: ProduitKit[]; form: Retour } = $props();

	const initiales = $derived(Object.fromEntries((s?.kit ?? []).map((l) => [l.produit_id, l.quantite])) as Record<number, number>);
	let saisies = $state<Record<number, number>>({});
	let mode = $state('');
	let filtre = $state('');

	$effect.pre(() => {
		// (Ré)initialisation à partir de la souscription ou des valeurs réaffichées après une erreur
		const q: Record<number, number> = {};
		for (const p of kit) q[p.id] = Number(valeur(form, `kit_${p.id}`, initiales[p.id] ?? 0)) || 0;
		saisies = q;
		mode = String(valeur(form, 'mode_souscription', s?.mode_souscription || ''));
	});

	const total = $derived(kit.reduce((t, p) => t + p.prix_distributeur * (saisies[p.id] || 0), 0));
	const visibles = $derived(
		filtre.trim() ? kit.filter((p) => `${p.nom} ${p.reference}`.toLowerCase().includes(filtre.trim().toLowerCase())) : kit
	);
	const alerte = $derived(
		total === 0
			? null
			: total < SEUIL_MINIMUM
				? `Encore ${fcfa(SEUIL_MINIMUM - total)} pour atteindre le minimum de ${fcfa(SEUIL_MINIMUM)}.`
				: mode === '2' && total > PLAFOND_CREDIT
					? `À crédit, le kit ne peut dépasser ${fcfa(PLAFOND_CREDIT)} : retirez ${fcfa(total - PLAFOND_CREDIT)}.`
					: null
	);
</script>

<TexteBloc bloc={{ paragraphes: INTRODUCTIONS[9].paragraphes }} />

<Choix
	legende="Mode de souscription"
	name="mode_souscription"
	bind:value={mode}
	erreur={form?.champs?.mode_souscription}
	options={[
		{ value: '1', label: 'Fonds propres', description: `Je règle mon kit (au moins ${fcfa(SEUIL_MINIMUM)})` },
		{ value: '2', label: 'Crédit', description: `Votre frangine étudie ma demande (kit de ${fcfa(SEUIL_MINIMUM)} à ${fcfa(PLAFOND_CREDIT)})` }
	]}
/>

<section class="space-y-3" aria-labelledby="titre-kit" id="champ-produits">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<h3 id="titre-kit" class="text-lg font-bold">Mon kit de démarrage</h3>
		<div class="relative w-full sm:w-64">
			<label for="filtre-kit" class="sr-only">Filtrer les produits</label>
			<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
			<input id="filtre-kit" type="search" bind:value={filtre} placeholder="Filtrer les produits" class="pl-10" />
		</div>
	</div>
	{#if form?.champs?.produits}<p class="font-semibold text-alerte" role="alert">{form.champs.produits}</p>{/if}

	<ul class="divide-y divide-fleuve-900/5 rounded-xl bg-white ring-1 ring-fleuve-100">
		{#each kit as p (p.id)}
			<li class="grid grid-cols-[3rem_1fr_auto] items-center gap-3 p-3 {visibles.includes(p) ? '' : 'hidden'}">
				<div class="size-12 overflow-hidden rounded-lg bg-sable">
					{#if p.photo_url}<img src={p.photo_url} alt="" loading="lazy" width="48" height="48" class="size-full object-contain" />
					{:else}<Package class="m-3 size-6 text-fleuve-200" aria-hidden="true" />{/if}
				</div>
				<div class="min-w-0">
					<label for="kit-{p.id}" class="block leading-snug font-semibold">{p.nom}</label>
					<p class="text-sm text-ardoise">
						<span class="montant">{fcfa(p.prix_distributeur)}</span>
						{#if saisies[p.id]} · <strong class="montant text-encre">{fcfa(p.prix_distributeur * saisies[p.id])}</strong>{/if}
					</p>
				</div>
				<input
					id="kit-{p.id}"
					name="kit_{p.id}"
					type="number"
					inputmode="numeric"
					min="0"
					max="999"
					value={saisies[p.id] || 0}
					oninput={(e) => (saisies[p.id] = Math.max(0, Math.trunc(Number(e.currentTarget.value) || 0)))}
					class="w-20! text-center"
				/>
			</li>
		{/each}
	</ul>

	<div class="sticky bottom-20 z-10 rounded-xl bg-fleuve-800 p-4 text-white shadow-levee lg:bottom-4" aria-live="polite">
		<div class="flex items-baseline justify-between gap-3">
			<span>Montant de la souscription</span>
			<strong class="montant font-display text-2xl">{fcfa(total)}</strong>
		</div>
		{#if alerte}<p class="mt-1 text-sm text-soleil-300">{alerte}</p>{/if}
	</div>
	<TexteBloc bloc={{ apres: INTRODUCTIONS[9].apres }} />
</section>
