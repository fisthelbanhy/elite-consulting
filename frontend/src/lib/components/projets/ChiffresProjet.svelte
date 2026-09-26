<script lang="ts">
	/** Plan de financement d'un projet (F-S4-18) : collecté / promis / reste, devis, apport, réalisation. */
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import { fcfa, pourcentage } from '$lib/format';
	import type { ProjetDetail } from '$lib/types/projets';

	let { projet: p }: { projet: ProjetDetail } = $props();
</script>

<section class="carte space-y-5 p-6" aria-labelledby="titre-chiffres">
	<h2 id="titre-chiffres" class="text-xl font-bold">Plan de financement</h2>
	<div class="space-y-2">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p><span class="montant font-display text-3xl font-extrabold text-foret-700">{fcfa(p.montant_collecte)}</span> <span class="text-ardoise">collectés</span></p>
			<p class="text-ardoise">objectif <span class="montant font-semibold text-encre">{fcfa(p.besoin_financement)}</span></p>
		</div>
		<Jauge valeur={p.montant_collecte} max={p.besoin_financement} label="Fonds collectés : {pourcentage(p.montant_collecte, p.besoin_financement)} % du besoin" />
	</div>
	<dl class="grid gap-3 sm:grid-cols-3">
		<div class="rounded-xl bg-creme p-3">
			<dt class="text-sm text-ardoise">Fonds promis</dt>
			<dd class="montant text-lg font-bold">{fcfa(p.montant_promis)}</dd>
			<dd class="text-xs text-ardoise">{pourcentage(p.montant_promis, p.besoin_financement)} % du besoin · {p.nombre_apports} apport{p.nombre_apports > 1 ? 's' : ''}</dd>
		</div>
		<div class="rounded-xl bg-creme p-3">
			<dt class="text-sm text-ardoise">Reste à collecter</dt>
			<dd class="montant text-lg font-bold">{fcfa(p.reste_a_collecter)}</dd>
		</div>
		<div class="rounded-xl bg-creme p-3">
			<dt class="text-sm text-ardoise">Coût total du projet</dt>
			<dd class="montant text-lg font-bold">{fcfa(p.devis_projet)}</dd>
			<dd class="text-xs text-ardoise">dont apport du porteur : <span class="montant">{fcfa(p.apport_fond_propre)}</span></dd>
		</div>
	</dl>
	<div>
		<p class="mb-1.5 flex justify-between text-sm"><span class="text-ardoise">Niveau de réalisation</span><strong>{p.niveau_realisation} %</strong></p>
		<Jauge valeur={p.niveau_realisation} max={100} couleur="soleil" label="Niveau de réalisation : {p.niveau_realisation} %" />
	</div>
</section>
