<script lang="ts">
	/** En-tête commun des pages de trésorerie avec les 4 sous-rubriques en onglets (F-S7-01). */
	import type { Snippet } from 'svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import { RUBRIQUES_TRESORERIE, type CleRubrique, type CompteursTresorerie } from '$lib/types/tresorerie';

	let {
		titre,
		sousTitre,
		fil = [],
		compteurs = null,
		children
	}: {
		titre: string;
		sousTitre?: string;
		fil?: { href: string; label: string }[];
		compteurs?: CompteursTresorerie | null;
		children?: Snippet;
	} = $props();

	const cles = Object.keys(RUBRIQUES_TRESORERIE) as CleRubrique[];
</script>

<EnTetePage {titre} {sousTitre} surtitre="Trésorerie & crédit" fil={[{ href: '/tresorerie', label: 'Trésorerie' }, ...fil]}>
	{@render children?.()}
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				label="Services de trésorerie"
				onglets={cles.map((c) => ({ href: `/tresorerie/${c}`, label: RUBRIQUES_TRESORERIE[c].titre, compteur: compteurs ? compteurs[c] : undefined }))}
			/>
		</div>
	{/snippet}
</EnTetePage>
