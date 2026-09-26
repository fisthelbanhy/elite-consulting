<script lang="ts">
	/**
	 * Vignette + texte + « Voir la suite » (widget legacy « Continuer la suite »).
	 * Le préchargement au survol est désactivé : ouvrir une publicité compte une vue (F-TRV-46).
	 */
	import MediaPublicite from './MediaPublicite.svelte';
	import { tronquer } from '$lib/format';
	import type { PubliciteDiffusee } from '$lib/types/publicites';

	let { pub, actif = false, compacte = false }: { pub: PubliciteDiffusee; actif?: boolean; compacte?: boolean } = $props();
</script>

<a
	href="/publicites/{pub.id}"
	data-sveltekit-preload-data="off"
	aria-current={actif ? 'page' : undefined}
	class="carte flex h-full gap-3 p-3 transition-shadow hover:shadow-levee {compacte ? 'flex-row items-center' : 'flex-col'} {actif
		? 'ring-2 ring-laterite-600'
		: ''}"
>
	<MediaPublicite {pub} class={compacte ? 'w-24 shrink-0' : ''} />
	<div class="min-w-0 flex-1 space-y-1">
		{#if pub.annonceur}<p class="truncate text-xs font-semibold tracking-wide text-ardoise uppercase">{pub.annonceur}</p>{/if}
		<p class="text-[15px] leading-snug text-encre">{tronquer(pub.texte_affiche, compacte ? 60 : 110)}</p>
		<p class="text-sm font-semibold text-fleuve-700">Voir la suite <span aria-hidden="true">→</span></p>
	</div>
</a>
