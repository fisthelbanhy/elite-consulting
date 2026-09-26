<script lang="ts">
	/** Mise en avant de la date limite d'un appel d'offres : « Clôture dans 5 jours ». */
	import Clock from '@lucide/svelte/icons/clock';
	import { date } from '$lib/format';

	let {
		jours,
		dateLimite,
		etat,
		complet = false
	}: { jours: number | null; dateLimite: string | null; etat: number; complet?: boolean } = $props();

	const info = $derived.by(() => {
		if (etat === 4) return { texte: 'Clôturé', ton: 'bg-sable text-ardoise' };
		if (jours === null) return { texte: 'Date limite non précisée', ton: 'bg-sable text-ardoise' };
		if (jours < 0) return { texte: `Clôturé le ${date(dateLimite)}`, ton: 'bg-sable text-ardoise' };
		if (jours === 0) return { texte: "Clôture aujourd'hui", ton: 'bg-alerte-50 text-alerte' };
		if (jours === 1) return { texte: 'Clôture demain', ton: 'bg-alerte-50 text-alerte' };
		if (jours <= 7) return { texte: `Clôture dans ${jours} jours`, ton: 'bg-laterite-50 text-laterite-700' };
		return { texte: `Clôture dans ${jours} jours`, ton: 'bg-foret-50 text-foret-700' };
	});
</script>

<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold {info.ton}">
	<Clock class="size-4" aria-hidden="true" />
	{info.texte}{#if complet && dateLimite && jours !== null && jours >= 0 && etat !== 4}<span class="font-normal"> · {date(dateLimite)}</span>{/if}
</span>
