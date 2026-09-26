<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import LogOut from '@lucide/svelte/icons/log-out';
	import User from '@lucide/svelte/icons/user';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Mail from '@lucide/svelte/icons/mail';
	import Store from '@lucide/svelte/icons/store';
	import Logo from '$lib/components/Logo.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { PILIERS, liensVisibles, messageWhatsAppPour } from '$lib/navigation';
	import { lienTel, lienWhatsApp, telephone } from '$lib/format';
	import type { MembreMoi, Parametres } from '$lib/types';

	let {
		membre,
		parametres,
		panier = 0,
		messages = 0
	}: { membre: MembreMoi | null; parametres: Parametres; panier?: number; messages?: number } = $props();

	let ouvert = $state<string | null>(null);
	let tiroir = $state(false);
	let menuMembre = $state(false);

	afterNavigate(() => {
		ouvert = null;
		tiroir = false;
		menuMembre = false;
	});

	function clavier(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			ouvert = null;
			tiroir = false;
			menuMembre = false;
		}
	}
	function clicExterieur(e: MouseEvent) {
		const t = e.target as HTMLElement;
		if (!t.closest('[data-menu]')) {
			ouvert = null;
			menuMembre = false;
		}
	}
	const wa = $derived(lienWhatsApp(parametres.whatsapp, messageWhatsAppPour(page.url.pathname)));
	const pilierActif = $derived(
		PILIERS.find((p) => p.liens.some((l) => page.url.pathname === l.href || page.url.pathname.startsWith(l.href + '/')) || page.url.pathname === p.href)?.id
	);
</script>

<svelte:window onkeydown={clavier} onclick={clicExterieur} />

<a href="#contenu" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
	Aller au contenu
</a>

<!-- Barre de confiance (ADR-0008, bloc 0) -->
<div class="hidden bg-fleuve-800 text-[13px] text-fleuve-100 sm:block">
	<div class="conteneur flex h-9 items-center justify-between gap-4">
		<p class="flex items-center gap-1.5 truncate">
			<MapPin class="size-3.5 shrink-0" aria-hidden="true" />
			Basés à Brazzaville, {parametres.adresse} · Une vraie conseillère vous répond
		</p>
		<div class="flex shrink-0 items-center gap-4">
			{#if parametres.telephone_1}
				<a href={lienTel(parametres.telephone_1)} class="flex items-center gap-1.5 hover:text-white">
					<Phone class="size-3.5" aria-hidden="true" />{telephone(parametres.telephone_1)}
				</a>
			{/if}
			<a href="/aide" class="hover:text-white">Comment ça marche ?</a>
			<a href="/contact" class="hover:text-white">Contact</a>
		</div>
	</div>
</div>

<header class="sticky top-0 z-40 border-b border-fleuve-900/5 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
	<div class="conteneur flex h-16 items-center gap-3 lg:h-[72px]">
		<a href="/" class="mr-2 shrink-0" aria-label="{parametres.nom_site} — accueil"><Logo /></a>

		<!-- Navigation principale (bureau) -->
		<nav aria-label="Navigation principale" class="hidden flex-1 lg:block">
			<ul class="flex items-center gap-1">
				{#each PILIERS as p (p.id)}
					<li class="relative" data-menu>
						<button
							type="button"
							class="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[15px] font-semibold whitespace-nowrap transition-colors hover:bg-fleuve-50 {pilierActif === p.id
								? 'text-laterite-700'
								: 'text-fleuve-800'}"
							aria-expanded={ouvert === p.id}
							aria-controls="menu-{p.id}"
							onclick={() => (ouvert = ouvert === p.id ? null : p.id)}
						>
							{p.titre}
							<ChevronDown class="size-4 transition-transform {ouvert === p.id ? 'rotate-180' : ''}" aria-hidden="true" />
						</button>
						{#if ouvert === p.id}
							<div id="menu-{p.id}" class="absolute top-full left-0 mt-2 w-[26rem] rounded-2xl bg-white p-3 shadow-levee ring-1 ring-fleuve-900/5">
								<p class="px-3 pt-1 pb-2 text-xs font-semibold tracking-wide text-ardoise uppercase">{p.accroche}</p>
								<ul>
									{#each liensVisibles(p.liens, parametres) as l (l.href)}
										<li>
											<a href={l.href} class="block rounded-xl px-3 py-2.5 hover:bg-creme">
												<span class="block font-semibold text-fleuve-800">{l.label}</span>
												<span class="block text-sm text-ardoise">{l.description}</span>
											</a>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>

		<div class="ml-auto flex items-center gap-1.5 sm:gap-2">
			<a
				href={wa}
				target="_blank"
				rel="noopener"
				class="grid size-11 place-items-center rounded-xl text-foret-700 hover:bg-foret-50 lg:hidden"
				aria-label="Écrire à une conseillère sur WhatsApp"
			>
				<MessageCircle class="size-6" aria-hidden="true" />
			</a>

			{#if membre}
				<a
					href={membre.est_gestionnaire ? '/gestion/messages' : '/espace/messages'}
					class="relative hidden size-11 place-items-center rounded-xl text-fleuve-700 hover:bg-fleuve-50 sm:grid"
					aria-label="Messages ({messages} non lu{messages > 1 ? 's' : ''})"
				>
					<Mail class="size-6" aria-hidden="true" />
					{#if messages > 0}
						<span class="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-foret-600 px-1 text-[11px] font-bold text-white">{messages}</span>
					{/if}
				</a>
				<a href="/panier" class="relative grid size-11 place-items-center rounded-xl text-fleuve-700 hover:bg-fleuve-50" aria-label="Panier ({panier} article{panier > 1 ? 's' : ''})">
					<ShoppingBag class="size-6" aria-hidden="true" />
					{#if panier > 0}
						<span class="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-laterite-600 px-1 text-[11px] font-bold text-white">{panier}</span>
					{/if}
				</a>
				<div class="relative hidden sm:block" data-menu>
					<button
						type="button"
						class="flex items-center gap-2 rounded-xl py-1 pr-2 pl-1 hover:bg-fleuve-50"
						aria-expanded={menuMembre}
						aria-controls="menu-membre"
						onclick={() => (menuMembre = !menuMembre)}
					>
						<Avatar src={membre.photo_url} nom={membre.pseudonyme || membre.nom} taille="sm" />
						<span class="max-w-32 truncate text-[15px] font-semibold text-fleuve-800">{membre.pseudonyme || membre.nom}</span>
						<ChevronDown class="size-4 text-ardoise" aria-hidden="true" />
					</button>
					{#if menuMembre}
						<div id="menu-membre" class="absolute top-full right-0 mt-2 w-60 rounded-2xl bg-white p-2 shadow-levee ring-1 ring-fleuve-900/5">
							<a href="/espace" class="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-creme"><LayoutDashboard class="size-5 text-fleuve-600" aria-hidden="true" />Mon espace</a>
							<a href="/espace/messages" class="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-creme"><Mail class="size-5 text-fleuve-600" aria-hidden="true" />Mes messages{#if messages > 0}<span class="ml-auto rounded-full bg-foret-600 px-2 text-xs font-bold text-white">{messages}</span>{/if}</a>
							<a href="/espace/profil" class="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-creme"><User class="size-5 text-fleuve-600" aria-hidden="true" />Mon profil</a>
							{#if membre.type_partenaire === 2 || membre.est_gestionnaire}
								<!-- Boutiques partenaires du service de courses (legacy « Vos articles », F-S3-69) -->
								<a href="/courses/catalogue" class="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-creme"><Store class="size-5 text-fleuve-600" aria-hidden="true" />Catalogue boutique</a>
							{/if}
							{#if membre.est_gestionnaire}
								<a href="/gestion" class="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-creme"><ShieldCheck class="size-5 text-fleuve-600" aria-hidden="true" />Gestion</a>
							{/if}
							<form method="POST" action="/deconnexion">
								<button class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-alerte hover:bg-alerte-50"><LogOut class="size-5" aria-hidden="true" />Se déconnecter</button>
							</form>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/connexion?suite={encodeURIComponent(page.url.pathname)}" class="hidden min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold whitespace-nowrap text-fleuve-700 hover:bg-fleuve-50 sm:inline-flex">
					Se connecter
				</a>
			{/if}

			<a href="/diagnostic" class="hidden min-h-11 items-center rounded-xl bg-laterite-600 px-4 text-[15px] font-semibold whitespace-nowrap text-white shadow-sm hover:bg-laterite-700 xl:inline-flex">
				Diagnostic gratuit
			</a>

			<button
				type="button"
				class="grid size-11 place-items-center rounded-xl text-fleuve-700 hover:bg-fleuve-50 lg:hidden"
				aria-label="Ouvrir le menu"
				aria-expanded={tiroir}
				onclick={() => (tiroir = true)}
			>
				<Menu class="size-6" aria-hidden="true" />
			</button>
		</div>
	</div>
</header>

<!-- Tiroir de navigation (mobile) -->
{#if tiroir}
	<div class="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
		<button class="absolute inset-0 bg-encre/40" aria-label="Fermer le menu" onclick={() => (tiroir = false)}></button>
		<div class="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-creme shadow-levee">
			<div class="flex h-16 items-center justify-between border-b border-fleuve-900/5 bg-white px-4">
				<Logo />
				<button class="grid size-11 place-items-center rounded-xl hover:bg-fleuve-50" aria-label="Fermer le menu" onclick={() => (tiroir = false)}>
					<X class="size-6" aria-hidden="true" />
				</button>
			</div>
			<div class="space-y-6 p-4 pb-28">
				<a href="/diagnostic" class="flex min-h-12 items-center justify-center rounded-xl bg-laterite-600 px-5 font-semibold text-white">Faire mon diagnostic gratuit</a>
				{#each PILIERS as p (p.id)}
					<section>
						<h2 class="mb-2 px-1 text-sm font-bold tracking-wide text-ardoise uppercase">{p.titre}</h2>
						<ul class="carte divide-y divide-fleuve-900/5">
							{#each liensVisibles(p.liens, parametres) as l (l.href)}
								<li><a href={l.href} class="block px-4 py-3 font-semibold text-fleuve-800">{l.label}</a></li>
							{/each}
						</ul>
					</section>
				{/each}
				<section class="carte divide-y divide-fleuve-900/5">
					{#if membre}
						<a href="/espace" class="block px-4 py-3 font-semibold text-fleuve-800">Mon espace</a>
						{#if membre.est_gestionnaire}<a href="/gestion" class="block px-4 py-3 font-semibold text-fleuve-800">Gestion</a>{/if}
						<form method="POST" action="/deconnexion"><button class="block w-full px-4 py-3 text-left font-semibold text-alerte">Se déconnecter</button></form>
					{:else}
						<a href="/connexion" class="block px-4 py-3 font-semibold text-fleuve-800">Se connecter</a>
						<a href="/inscription" class="block px-4 py-3 font-semibold text-fleuve-800">Créer mon compte</a>
					{/if}
					<a href="/contact" class="block px-4 py-3 font-semibold text-fleuve-800">Contact</a>
					<a href="/aide" class="block px-4 py-3 font-semibold text-fleuve-800">Comment ça marche ?</a>
				</section>
			</div>
		</div>
	</div>
{/if}
