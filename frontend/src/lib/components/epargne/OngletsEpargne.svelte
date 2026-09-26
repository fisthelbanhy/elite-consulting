<script lang="ts">
	/** Sous-onglets de l'épargne solidaire (F-S4-02). */
	import Onglets from '$lib/components/ui/Onglets.svelte';

	let { actif }: { actif: 'presentation' | 'dons' | 'pointage' } = $props();
</script>

<div class="mt-6">
	<Onglets
		label="Épargne solidaire"
		onglets={[
			{ href: '/epargne', label: 'Présentation', actif: actif === 'presentation' },
			{ href: '/epargne/dons-placements', label: 'Dons & placements', actif: actif === 'dons' },
			{ href: '/epargne/carte-pointage', label: 'Carte de pointage', actif: actif === 'pointage' }
		]}
	/>
</div>
