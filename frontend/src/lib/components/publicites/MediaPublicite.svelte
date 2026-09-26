<script lang="ts">
	/**
	 * Visuel d'une publicité selon le **vrai** type du fichier (correctif F-TRV-47) :
	 * image, lecteur audio ou vidéo HTML5 (F-TRV-45). Jamais de lecture automatique (ADR-0008).
	 * Sans fichier : un aplat au motif pagne avec le nom de l'annonceur.
	 */
	import Music from '@lucide/svelte/icons/music';
	import Clapperboard from '@lucide/svelte/icons/clapperboard';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import type { GenrePublicite } from '$lib/types/publicites';

	let {
		pub,
		taille = 'vignette',
		class: classe = ''
	}: {
		pub: { fichier_url: string | null; genre: GenrePublicite; annonceur?: string | null };
		taille?: 'vignette' | 'grand';
		class?: string;
	} = $props();

	const grand = $derived(taille === 'grand');
	const nom = $derived(pub.annonceur ?? 'Annonceur');
</script>

{#if pub.fichier_url && pub.genre === 'image'}
	<img
		src={pub.fichier_url}
		alt={grand ? `Publicité de ${nom}` : ''}
		loading={grand ? 'eager' : 'lazy'}
		class="w-full rounded-xl bg-sable object-cover {grand ? 'max-h-[70vh] object-contain' : 'aspect-[4/3]'} {classe}"
	/>
{:else if pub.fichier_url && pub.genre === 'video' && grand}
	<!-- svelte-ignore a11y_media_has_caption -->
	<video src={pub.fichier_url} controls preload="metadata" playsinline class="aspect-video w-full rounded-xl bg-encre {classe}">
		Votre navigateur ne lit pas cette vidéo : <a href={pub.fichier_url} class="lien">téléchargez-la</a>.
	</video>
{:else if pub.fichier_url && pub.genre === 'son' && grand}
	<div class="pagne grid place-items-center gap-4 rounded-xl bg-fleuve-50 p-8 {classe}">
		<span class="grid size-16 place-items-center rounded-full bg-white text-fleuve-700 shadow-douce"><Music class="size-8" aria-hidden="true" /></span>
		<audio src={pub.fichier_url} controls preload="metadata" class="w-full max-w-md">
			Votre navigateur ne lit pas ce son : <a href={pub.fichier_url} class="lien">téléchargez-le</a>.
		</audio>
	</div>
{:else}
	{@const Icone = pub.genre === 'son' ? Music : pub.genre === 'video' ? Clapperboard : Megaphone}
	<div
		class="pagne flex flex-col items-center justify-center gap-2 rounded-xl bg-fleuve-50 p-4 text-center text-fleuve-700 {grand
			? 'min-h-64'
			: 'aspect-[4/3]'} {classe}"
	>
		<span class="grid size-12 place-items-center rounded-full bg-white shadow-douce"><Icone class="size-6" aria-hidden="true" /></span>
		<span class="text-sm font-semibold">
			{pub.genre === 'son' ? 'Annonce audio' : pub.genre === 'video' ? 'Annonce vidéo' : nom}
		</span>
	</div>
{/if}
