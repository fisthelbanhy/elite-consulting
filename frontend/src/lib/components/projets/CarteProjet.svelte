<script lang="ts">
	/** Carte d'un appel de fonds (F-S4-07) : chiffres clés, jauge de collecte, promoteur/état pour l'auteur et la frangine. */
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Eye from '@lucide/svelte/icons/eye';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import { fcfa, pourcentage, tronquer } from '$lib/format';
	import type { ProjetResume } from '$lib/types/projets';

	let { projet: p }: { projet: ProjetResume } = $props();
	const pctPromis = $derived(pourcentage(p.montant_promis, p.besoin_financement));
	const pctCollecte = $derived(pourcentage(p.montant_collecte, p.besoin_financement));
</script>

<a href="/projets/{p.id}" class="carte flex h-full flex-col overflow-hidden transition-shadow hover:shadow-levee">
	{#if p.photo_url}
		<img src={p.photo_url} alt="" class="aspect-[16/7] w-full object-cover" loading="lazy" />
	{:else}
		<div class="pagne aspect-[16/7] w-full bg-sable" aria-hidden="true"></div>
	{/if}
	<div class="flex flex-1 flex-col p-5">
		<div class="flex flex-wrap items-center gap-2">
			{#if p.secteur}<Badge ton="fleuve">{p.secteur.libelle}</Badge>{/if}
			{#if p.etat !== 2}<BadgeEtat etat={p.etat} />{/if}
			<span class="text-xs text-ardoise">{p.reference}</span>
		</div>
		<h3 class="mt-2 font-display text-lg leading-snug font-bold text-fleuve-800">{p.nom_projet}</h3>
		<p class="mt-1 text-[15px] text-ardoise">{tronquer(p.objet_projet, 110)}</p>

		<div class="mt-4 space-y-2">
			<div class="flex items-baseline justify-between gap-2 text-sm">
				<span><strong class="montant text-base text-foret-700">{fcfa(p.montant_collecte)}</strong> collectés</span>
				<span class="text-ardoise">sur {fcfa(p.besoin_financement)}</span>
			</div>
			<Jauge valeur={p.montant_collecte} max={p.besoin_financement} label="Fonds collectés : {pctCollecte} % du besoin" />
			<p class="text-sm text-ardoise">Promis : <span class="montant font-semibold text-encre">{fcfa(p.montant_promis)}</span> ({pctPromis} %)</p>
		</div>

		<dl class="mt-4 grid grid-cols-3 gap-2 border-t border-fleuve-900/5 pt-3 text-center text-xs">
			<div><dt class="text-ardoise">Devis</dt><dd class="montant font-semibold">{fcfa(p.devis_projet)}</dd></div>
			<div><dt class="text-ardoise">Apport</dt><dd class="montant font-semibold">{fcfa(p.apport_fond_propre)}</dd></div>
			<div><dt class="text-ardoise">Réalisé</dt><dd class="font-semibold">{p.niveau_realisation} %</dd></div>
		</dl>

		<div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-sm text-ardoise">
			{#if p.ville}<span class="flex items-center gap-1"><MapPin class="size-4" aria-hidden="true" />{p.ville.nom}</span>{/if}
			<span class="flex items-center gap-1"><Eye class="size-4" aria-hidden="true" />{p.nombre_visites}<span class="sr-only"> consultations</span></span>
			{#if p.nom_promoteur}<span>Promoteur : {p.nom_promoteur}</span>{/if}
		</div>
	</div>
</a>
