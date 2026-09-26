<script lang="ts">
	/** Carte d'un bien dans la liste (F-S3-12) : photo, type et transaction, lieu, surface, pièces, prix. */
	import { page } from '$app/state';
	import Eye from '@lucide/svelte/icons/eye';
	import House from '@lucide/svelte/icons/house';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Vignette from '$lib/components/annonces/Vignette.svelte';
	import { dateCourte, relatif, tronquer } from '$lib/format';
	import type { BienResume } from '$lib/types/immobilier';
	import { lieuBien, prixBien, titreBien } from './libelles';

	let { bien: b, gestion = false }: { bien: BienResume; gestion?: boolean } = $props();
	const titre = $derived(titreBien(page.data.enums, b));
	const lieu = $derived(lieuBien(b));
	const recherche = $derived(b.offre_ou_recherche === 2);
</script>

<a href="/immobilier/{b.id}" class="carte group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-levee">
	<div class="relative">
		<Vignette src={b.photo_url} alt={titre} icone={House} />
		<div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
			<Badge ton={recherche ? 'soleil' : 'fleuve'}>{recherche ? 'Recherche' : 'Offre'}</Badge>
			{#if b.situation === 2 && !recherche}<Badge>Occupé</Badge>{/if}
			{#if b.etat !== 2}<BadgeEtat etat={b.etat} />{/if}
		</div>
	</div>
	<div class="flex flex-1 flex-col p-4">
		<p class="montant font-display text-xl font-extrabold text-laterite-700">{prixBien(b)}</p>
		<h3 class="mt-1 font-display text-lg leading-snug font-bold text-fleuve-800 group-hover:underline">{titre}</h3>
		{#if lieu}<p class="mt-1 flex items-center gap-1 text-[15px] text-ardoise"><MapPin class="size-4 shrink-0" aria-hidden="true" />{lieu}</p>{/if}
		<p class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-encre">
			<span>{b.surface_m2} m²</span>
			{#if b.nombre_pieces}<span>{b.nombre_pieces} pièce{b.nombre_pieces > 1 ? 's' : ''}</span>{/if}
			{#if b.nombre_chambres}<span>{b.nombre_chambres} chambre{b.nombre_chambres > 1 ? 's' : ''}</span>{/if}
		</p>
		{#if b.description}<p class="mt-2 text-sm text-ardoise">{tronquer(b.description, 110)}</p>{/if}
		<p class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-ardoise">
			<span>{b.reference}</span>
			<span>{relatif(b.date_creation)}</span>
			{#if gestion}
				<span class="flex items-center gap-1"><Eye class="size-3.5" aria-hidden="true" />{b.nombre_visites} visite{b.nombre_visites > 1 ? 's' : ''}{#if b.date_derniere_visite} · {dateCourte(b.date_derniere_visite)}{/if}</span>
			{/if}
		</p>
	</div>
</a>
