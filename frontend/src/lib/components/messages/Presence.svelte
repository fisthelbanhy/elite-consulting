<script lang="ts">
	/** Pastille de présence (actif il y a moins de 5 minutes, ADR-0007 T3), toujours accompagnée d'un texte. */
	let {
		enLigne,
		libelleEnLigne = 'En ligne',
		libelleHorsLigne = 'Hors ligne',
		class: classe = ''
	}: { enLigne: boolean; libelleEnLigne?: string; libelleHorsLigne?: string; class?: string } = $props();
</script>

<span class="inline-flex items-center gap-2 text-sm font-semibold {enLigne ? 'text-foret-700' : 'text-ardoise'} {classe}">
	<span class="relative flex size-2.5" aria-hidden="true">
		{#if enLigne}<span class="absolute inline-flex size-full animate-ping rounded-full bg-foret-600 opacity-60"></span>{/if}
		<span class="relative inline-flex size-2.5 rounded-full {enLigne ? 'bg-foret-600' : 'bg-ardoise/40'}"></span>
	</span>
	{enLigne ? libelleEnLigne : libelleHorsLigne}
</span>
