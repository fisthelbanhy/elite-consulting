<script lang="ts">
	/** Membres d'un likelemba (F-S4-33/34) : ordre, membre, code, date d'entrée, état (« Attente »). */
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { dateCourte } from '$lib/format';
	import type { AdhesionResume } from '$lib/types/likelemba';

	let {
		adhesions,
		groupeId,
		lienPour
	}: { adhesions: AdhesionResume[]; groupeId: number; lienPour: (a: AdhesionResume) => boolean } = $props();
</script>

<ul class="divide-y divide-fleuve-900/5">
	{#each adhesions as a (a.id)}
		{@const lien = lienPour(a)}
		<li>
			<svelte:element
				this={lien ? 'a' : 'div'}
				href={lien ? `/likelemba/${groupeId}/adhesions/${a.id}` : undefined}
				class="flex items-center gap-3 py-3 {lien ? 'hover:bg-fleuve-50/60 sm:px-2' : ''}"
			>
				<span class="grid size-9 shrink-0 place-items-center rounded-full bg-sable font-display font-bold text-fleuve-700" title="Ordre d'entrée">
					{a.ordre ?? '–'}
				</span>
				<Avatar src={a.membre?.photo_url} nom={a.membre?.pseudonyme} taille="sm" />
				<div class="min-w-0 flex-1">
					<p class="font-semibold">{a.membre?.pseudonyme ?? 'Membre'}</p>
					<p class="text-sm text-ardoise">Code {a.code || '—'} · entré le {dateCourte(a.date_entree)}</p>
				</div>
				{#if a.etat === 1}<Badge ton="soleil">Attente</Badge>{:else if a.etat === 3}<Badge ton="alerte">Retiré</Badge>{:else if a.etat === 4}<Badge>Clôturé</Badge>{/if}
				{#if lien}<ChevronRight class="size-5 shrink-0 text-ardoise" aria-hidden="true" />{/if}
			</svelte:element>
		</li>
	{/each}
</ul>
