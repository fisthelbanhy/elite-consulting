<script lang="ts">
	/**
	 * Chrome du back-office : le layout racine n'affiche pas l'en-tête public sous `/gestion`.
	 * Barre latérale fixe sur grand écran, tiroir sur mobile.
	 */
	import { afterNavigate } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import BarreLaterale from '$lib/components/gestion/BarreLaterale.svelte';

	let { data, children } = $props();
	let ouvert = $state(false);

	afterNavigate(() => (ouvert = false));

	function clavier(e: KeyboardEvent) {
		if (e.key === 'Escape') ouvert = false;
	}
</script>

<svelte:window onkeydown={clavier} />
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<a href="#contenu-gestion" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
	Aller au contenu
</a>

<div class="min-h-dvh bg-creme lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
	<!-- Barre supérieure (mobile) -->
	<header class="sticky top-0 z-30 flex h-14 items-center gap-2 bg-fleuve-900 px-2 text-white lg:hidden">
		<button
			type="button"
			class="grid size-11 place-items-center rounded-lg hover:bg-white/10"
			aria-expanded={ouvert}
			aria-controls="navigation-gestion"
			onclick={() => (ouvert = true)}
		>
			<Menu class="size-6" aria-hidden="true" /><span class="sr-only">Ouvrir le menu de la gestion</span>
		</button>
		<p class="truncate font-display font-bold">Gestion · {data.parametres.nom_site}</p>
	</header>

	<!-- Barre latérale : colonne fixe (bureau) ou tiroir (mobile) -->
	<div class="{ouvert ? 'fixed inset-0 z-40' : 'hidden'} lg:sticky lg:top-0 lg:block lg:h-dvh">
		<button class="absolute inset-0 bg-encre/50 lg:hidden" aria-label="Fermer le menu" onclick={() => (ouvert = false)}></button>
		<div id="navigation-gestion" class="relative h-full w-72 max-w-[85%] lg:w-full lg:max-w-none">
			<BarreLaterale gestionnaire={data.gestionnaire} compteurs={data.compteursGestion} nomSite={data.parametres.nom_site} />
			<button
				type="button"
				class="absolute top-3 right-2 grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden"
				onclick={() => (ouvert = false)}
			>
				<X class="size-5" aria-hidden="true" /><span class="sr-only">Fermer le menu</span>
			</button>
		</div>
	</div>

	<main id="contenu-gestion" tabindex="-1" class="min-w-0 pb-16 outline-none">
		{@render children()}
	</main>
</div>
