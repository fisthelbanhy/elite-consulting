<script lang="ts">
	/** Onglets de l'ancienne section « Entreprises - Marchés » (F-S6-01) : annuaire, comparateur,
	 * marchés et projets (compteur des projets publiés, comme le legacy). */
	import Onglets from '$lib/components/ui/Onglets.svelte';

	let { projets = null }: { projets?: number | null } = $props();
</script>

<div class="mt-6">
	<Onglets
		label="Entreprises et marchés"
		onglets={[
			{ href: '/entreprises', label: 'Annuaire des entreprises' },
			{ href: '/comparateur-prix', label: 'Comparateur de prix' },
			{ href: '/marches', label: 'Marchés et projets', compteur: projets }
		]}
	/>
</div>
