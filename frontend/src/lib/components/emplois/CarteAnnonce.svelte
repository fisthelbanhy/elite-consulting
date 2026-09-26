<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { age, relatif, tronquer } from '$lib/format';
	import type { AnnonceResume } from '$lib/types/emplois';

	let { annonce: a }: { annonce: AnnonceResume } = $props();
	const offre = $derived(a.type_annonce === 2);
</script>

<a href="/emplois/{a.id}" class="carte flex h-full gap-4 p-5 transition-shadow hover:shadow-levee">
	{#if !offre}<Avatar src={a.photo_url} nom={a.competences || a.reference} taille="lg" />{/if}
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-2">
			<Badge ton={offre ? 'laterite' : 'fleuve'}>{offre ? "Offre d'emploi" : 'Profil disponible'}</Badge>
			{#if a.etat !== 2}<BadgeEtat etat={a.etat} />{/if}
			<span class="text-xs text-ardoise">{a.reference}</span>
		</div>
		<h3 class="mt-2 font-display text-lg leading-snug font-bold text-fleuve-800">
			{offre ? a.poste_a_pourvoir || 'Poste à pourvoir' : tronquer(a.competences, 70) || 'Candidat·e'}
		</h3>
		{#if a.domaine}<p class="mt-0.5 text-[15px] text-ardoise">{a.domaine.libelle}</p>{/if}
		<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ardoise">
			{#if a.diplomes}<span class="flex items-center gap-1"><GraduationCap class="size-4" aria-hidden="true" />{tronquer(a.diplomes, 40)}</span>{/if}
			{#if !offre && a.date_naissance}<span>{age(a.date_naissance).split(' ').slice(0, 2).join(' ')}</span>{/if}
			<span class="flex items-center gap-1"><Eye class="size-4" aria-hidden="true" />{a.nombre_visites}</span>
			<span>{relatif(a.date_creation)}</span>
		</div>
	</div>
</a>
