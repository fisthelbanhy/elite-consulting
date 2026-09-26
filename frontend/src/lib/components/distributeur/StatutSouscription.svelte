<script lang="ts">
	/** Où en est une souscription : brouillon, envoyée (crédit à traiter / en attente de paiement), validée. */
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { SouscriptionResume } from '$lib/types/distributeur';

	let { souscription: s }: { souscription: SouscriptionResume } = $props();
	const statut = $derived.by(() => {
		if (s.etat === 3) return { ton: 'alerte', texte: 'Supprimée' } as const;
		if (s.etat === 2 || s.etat === 4) return { ton: 'foret', texte: 'Validée — distributeur' } as const;
		if (!s.envoyee) return { ton: 'neutre', texte: `Brouillon (étape ${s.etape_courante}/10)` } as const;
		if (s.mode_souscription === 2) return { ton: 'laterite', texte: 'Crédit à traiter' } as const;
		return { ton: 'soleil', texte: s.etat_paiement === 1 ? 'Paiement rejeté' : 'En attente de paiement' } as const;
	});
</script>

<Badge ton={statut.ton}>{statut.texte}</Badge>
