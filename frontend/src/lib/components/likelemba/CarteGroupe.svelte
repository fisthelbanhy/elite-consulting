<script lang="ts">
	/** Carte d'un groupe Likelemba (F-S4-28) : code, responsable, cotisation, périodicité, début, membres. */
	import Users from '@lucide/svelte/icons/users';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { date, fcfa, libelle, tronquer } from '$lib/format';
	import type { Enums } from '$lib/types';
	import type { GroupeResume } from '$lib/types/likelemba';

	let { groupe: g, enums }: { groupe: GroupeResume; enums: Enums } = $props();
</script>

<a href="/likelemba/{g.id}" class="carte flex h-full flex-col p-5 transition-shadow hover:shadow-levee">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="text-sm font-semibold tracking-wide text-ardoise">{g.code}</p>
			<p class="montant font-display text-2xl font-extrabold text-fleuve-800">{fcfa(g.montant_cotisation)}</p>
			<p class="text-sm text-ardoise">par personne, {libelle(enums, 'Periodicite', g.periodicite).toLowerCase() || 'périodicité à définir'}</p>
		</div>
		<span class="grid size-14 shrink-0 place-items-center rounded-full bg-foret-50 text-foret-700 ring-4 ring-foret-100" aria-hidden="true">
			<Users class="size-6" />
		</span>
	</div>
	<div class="mt-3 flex flex-wrap gap-2">
		{#if g.est_responsable}<Badge ton="laterite">Vous êtes responsable</Badge>{/if}
		{#if g.mon_adhesion_id}<Badge ton="foret">Vous êtes membre</Badge>{/if}
		{#if g.etat !== 2}<BadgeEtat etat={g.etat} />{/if}
	</div>
	{#if g.observation}<p class="mt-3 text-[15px] text-ardoise">{tronquer(g.observation, 120)}</p>{/if}
	<dl class="mt-auto grid grid-cols-3 gap-2 border-t border-fleuve-900/5 pt-3 text-sm">
		<div><dt class="flex items-center gap-1 text-ardoise"><Users class="size-3.5" aria-hidden="true" />Membres</dt><dd class="font-semibold">{g.nombre_adherents}</dd></div>
		<div><dt class="flex items-center gap-1 text-ardoise"><CalendarDays class="size-3.5" aria-hidden="true" />Début</dt><dd class="font-semibold">{g.date_debut ? date(g.date_debut) : '—'}</dd></div>
		<div><dt class="flex items-center gap-1 text-ardoise"><Repeat class="size-3.5" aria-hidden="true" />Cagnotte</dt><dd class="montant font-semibold">{fcfa(g.montant_cotisation * g.nombre_adherents)}</dd></div>
	</dl>
	{#if g.responsable}
		<p class="mt-3 flex items-center gap-2 text-sm text-ardoise">
			<Avatar src={g.responsable.photo_url} nom={g.responsable.pseudonyme} taille="sm" />Responsable : <span class="font-semibold text-encre">{g.responsable.pseudonyme}</span>
		</p>
	{/if}
</a>
