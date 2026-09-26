<script lang="ts">
	/** Sujet du forum dans une liste : objet, extrait, auteur, réponses, badge « Un conseiller a répondu ». */
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Lock from '@lucide/svelte/icons/lock';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { relatif, tronquer } from '$lib/format';
	import type { SujetResume } from '$lib/types/conseil-financier';

	let { sujet: s }: { sujet: SujetResume } = $props();
</script>

<a href="/conseil-financier/{s.id}" class="carte flex h-full gap-4 p-5 transition-shadow hover:shadow-levee">
	<Avatar src={s.auteur?.photo_url} nom={s.auteur?.pseudonyme} taille="md" />
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-2">
			{#if s.confidentialite === 1}<Badge><Lock class="size-3" aria-hidden="true" />Privé</Badge>{/if}
			{#if s.etat === 4}<Badge>Clôturé</Badge>{:else if s.etat === 1}<Badge ton="soleil">En attente</Badge>{/if}
			{#if s.repondu_par_conseiller}<Badge ton="foret"><CircleCheck class="size-3" aria-hidden="true" />Un conseiller a répondu</Badge>{/if}
		</div>
		<h3 class="mt-2 font-display text-lg leading-snug font-bold text-fleuve-800">{s.objet}</h3>
		<p class="mt-1 text-[15px] text-ardoise">{tronquer(s.texte, 160)}</p>
		<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ardoise">
			<span>{s.auteur?.pseudonyme ?? 'Membre'} · {relatif(s.date_creation)}</span>
			<span class="flex items-center gap-1"><MessageSquare class="size-4" aria-hidden="true" />{s.nombre_reponses} réponse{s.nombre_reponses > 1 ? 's' : ''}</span>
		</p>
	</div>
</a>
