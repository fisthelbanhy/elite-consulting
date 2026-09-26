<script lang="ts">
	/** Sujet du forum dans une liste : objet, extrait, auteur (pseudonyme), réponses. */
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Lock from '@lucide/svelte/icons/lock';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { relatif } from '$lib/format';
	import type { SujetResume } from '$lib/types/questions';

	let { sujet: s }: { sujet: SujetResume } = $props();
</script>

<a href="/questions/{s.id}" class="carte flex h-full flex-col p-5 transition-shadow hover:shadow-levee">
	<div class="flex flex-wrap items-center gap-2">
		{#if s.confidentialite === 1}
			<Badge ton="soleil"><Lock class="size-3" aria-hidden="true" />Privé : vous et la frangine</Badge>
		{/if}
		{#if s.etat !== 2}<BadgeEtat etat={s.etat} libelles={{ 1: 'Masqué', 3: 'Supprimé', 4: 'Clôturé' }} />{/if}
	</div>
	<h3 class="mt-2 font-display text-lg leading-snug font-bold text-fleuve-800">{s.objet}</h3>
	<p class="mt-1.5 line-clamp-3 flex-1 text-[15px] text-ardoise">{s.extrait}</p>
	<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ardoise">
		<span class="flex items-center gap-2">
			<Avatar src={s.auteur?.photo_url} nom={s.auteur?.pseudonyme} taille="sm" />
			<span class="font-semibold text-encre">{s.auteur?.pseudonyme ?? 'La frangine'}</span>
			{#if s.auteur_nom}<span>({s.auteur_nom})</span>{/if}
		</span>
		<span>{relatif(s.date_creation)}</span>
		<span class="flex items-center gap-1">
			<MessageSquare class="size-4" aria-hidden="true" />
			{s.nombre_reponses} réponse{s.nombre_reponses > 1 ? 's' : ''}
		</span>
	</div>
</a>
