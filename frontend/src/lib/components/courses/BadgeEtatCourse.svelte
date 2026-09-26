<script lang="ts">
	/** État d'une course (legacy EtatCourse) : 1 En attente, 2 Supprimée (annulée), 3 Effectuée, 4 Livrée. */
	import Badge from '$lib/components/ui/Badge.svelte';

	let { etat }: { etat: number } = $props();
	const libelles: Record<number, string> = { 1: 'En attente', 2: 'Annulée', 3: 'Achats effectués', 4: 'Livrée' };
	const tons = { 1: 'soleil', 2: 'alerte', 3: 'fleuve', 4: 'foret' } as const;
</script>

<Badge ton={tons[etat as 1 | 2 | 3 | 4] ?? 'neutre'}>{libelles[etat] ?? '—'}</Badge>
