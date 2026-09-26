<script lang="ts">
	import { page } from '$app/state';
	import Compass from '@lucide/svelte/icons/compass';
	import Lock from '@lucide/svelte/icons/lock';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { lienWhatsApp } from '$lib/format';

	const statut = $derived(page.status);
	const contenu = $derived(
		statut === 404
			? { titre: 'Cette page est introuvable', texte: page.error?.message && page.error.message !== 'Not Found' ? page.error.message : "Elle a peut-être été déplacée ou n'est plus publiée.", icone: Compass }
			: statut === 403
				? { titre: 'Accès réservé', texte: page.error?.message ?? "Vous n'avez pas les droits pour voir cette page.", icone: Lock }
				: statut === 503
					? { titre: 'Service momentanément indisponible', texte: page.error?.message ?? 'Réessayez dans un instant.', icone: CloudOff }
					: { titre: 'Une erreur est survenue', texte: page.error?.message ?? 'Réessayez dans un instant.', icone: CloudOff }
	);
	const wa = $derived(page.data?.parametres?.whatsapp as string | undefined);
</script>

<svelte:head>
	<title>{contenu.titre} — La Frangine</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur grid min-h-[60vh] place-items-center py-16 text-center">
	<div class="max-w-lg">
		<span class="mx-auto grid size-20 place-items-center rounded-full bg-sable text-fleuve-600">
			<contenu.icone class="size-10" aria-hidden="true" />
		</span>
		<p class="mt-6 text-sm font-semibold tracking-wide text-laterite-600 uppercase">Erreur {statut}</p>
		<h1 class="mt-2 text-3xl font-bold">{contenu.titre}</h1>
		<p class="mt-3 text-lg text-ardoise">{contenu.texte}</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<Bouton href="/">Retour à l'accueil</Bouton>
			{#if wa}
				<Bouton href={lienWhatsApp(wa, `Bonjour la Frangine, je rencontre une erreur ${statut} sur ${page.url.pathname}.`)} variante="whatsapp" target="_blank" rel="noopener">Nous prévenir</Bouton>
			{/if}
		</div>
	</div>
</div>
