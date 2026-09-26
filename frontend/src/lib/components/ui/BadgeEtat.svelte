<script lang="ts">
	/** État générique legacy : 1 Non traité, 2 Autorisé, 3 Supprimé, 4 Clôturé. */
	import Badge from './Badge.svelte';

	let { etat, libelles }: { etat: number; libelles?: Record<number, string> } = $props();
	const defaut: Record<number, string> = { 1: 'En attente', 2: 'Publié', 3: 'Supprimé', 4: 'Clôturé' };
	const tons = { 1: 'soleil', 2: 'foret', 3: 'alerte', 4: 'neutre' } as const;
</script>

<Badge ton={tons[etat as 1 | 2 | 3 | 4] ?? 'neutre'}>{(libelles ?? defaut)[etat] ?? '—'}</Badge>
