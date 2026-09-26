<script lang="ts">
	/** Carte d'un article en grille (F-S3-29) : photo, libellé, prix, état neuf/occasion, stock. */
	import Package from '@lucide/svelte/icons/package';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { fcfa, relatif } from '$lib/format';
	import type { ArticleResume } from '$lib/types/annonces';
	import Vignette from './Vignette.svelte';

	let { article: a, gestion = false }: { article: ArticleResume; gestion?: boolean } = $props();
	const recherche = $derived(a.offre_ou_recherche === 2);
</script>

<a href="/annonces/{a.id}" class="carte group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-levee">
	<div class="relative">
		<Vignette src={a.photo_url} alt={a.libelle} icone={Package} ratio="aspect-square" />
		<div class="absolute top-2 left-2 flex flex-wrap gap-1">
			{#if recherche}<Badge ton="soleil">Recherché</Badge>{/if}
			<Badge ton={a.neuf_ou_occasion === 1 ? 'foret' : 'neutre'}>{a.neuf_ou_occasion === 1 ? 'Neuf' : 'Occasion'}</Badge>
			{#if a.etat !== 2}<BadgeEtat etat={a.etat} />{/if}
		</div>
	</div>
	<div class="flex flex-1 flex-col p-3 sm:p-4">
		<h3 class="line-clamp-2 font-display text-base leading-snug font-bold text-fleuve-800 group-hover:underline">{a.libelle}</h3>
		{#if a.famille}<p class="mt-0.5 text-sm text-ardoise">{a.famille.libelle}</p>{/if}
		<p class="montant mt-auto pt-2 font-display text-lg font-extrabold text-laterite-700">
			{#if a.prix}{recherche ? `Budget ${fcfa(a.prix)}` : fcfa(a.prix)}{:else}Prix à débattre{/if}
		</p>
		<p class="flex flex-wrap gap-x-2 text-xs text-ardoise">
			{#if !recherche}
				<span class={a.quantite ? '' : 'font-semibold text-alerte'}>{a.quantite ? `${a.quantite} disponible${a.quantite > 1 ? 's' : ''}` : 'Épuisé'}</span>
			{/if}
			<span>{relatif(a.date_creation)}</span>
			{#if gestion}<span>{a.nombre_visites} visite{a.nombre_visites > 1 ? 's' : ''}</span>{/if}
		</p>
	</div>
</a>
