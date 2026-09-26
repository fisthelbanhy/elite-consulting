<script lang="ts">
	/** Rubriques de « Mon espace ». La page Messages est fournie par le module Messagerie. */
	import { page } from '$app/state';
	import Onglets from '$lib/components/ui/Onglets.svelte';

	let { messages = 0 }: { messages?: number } = $props();
</script>

<div class="mt-6">
	<Onglets
		label="Mon espace"
		onglets={[
			{ href: '/espace', label: 'Tableau de bord', actif: page.url.pathname === '/espace' },
			{ href: '/espace/profil', label: 'Mon profil' },
			{ href: '/espace/paiements', label: 'Mes paiements' },
			{ href: '/espace/messages', label: 'Messages', compteur: messages || null }
		]}
	/>
</div>
