<script lang="ts">
	/** Navigation du back-office (remplace le menu gestionnaire legacy `incl-menu1.php`). */
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Users from '@lucide/svelte/icons/users';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Database from '@lucide/svelte/icons/database';
	import Settings from '@lucide/svelte/icons/settings';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import type { MembreMoi } from '$lib/types';
	import type { Compteurs } from '$lib/types/gestion';

	let { gestionnaire, compteurs, nomSite }: { gestionnaire: MembreMoi; compteurs: Compteurs; nomSite: string } = $props();

	type Lien = { href: string; label: string; icone: Component; badge?: number; exact?: boolean };
	const groupes: { titre: string; liens: Lien[] }[] = $derived([
		{
			titre: 'Pilotage',
			liens: [
				{ href: '/gestion', label: 'Tableau de bord', icone: LayoutDashboard, exact: true },
				{ href: '/gestion/moderation', label: 'Modération', icone: ShieldCheck, badge: compteurs.fiches_en_attente }
			]
		},
		{
			titre: 'Membres',
			liens: [
				{ href: '/gestion/membres', label: 'Membres', icone: Users, badge: compteurs.nouveaux_membres },
				{ href: '/gestion/reinitialisations', label: 'Mots de passe oubliés', icone: KeyRound, badge: compteurs.reinitialisations_en_attente },
				{ href: '/gestion/paiements', label: 'Paiements', icone: Wallet, badge: compteurs.paiements_en_attente }
			]
		},
		{
			titre: 'Relation',
			liens: [
				{ href: '/gestion/messages', label: 'Messages', icone: MessagesSquare, badge: compteurs.messages_non_lus },
				{ href: '/gestion/contacts', label: 'Contacts', icone: Inbox, badge: compteurs.contacts_a_traiter },
				{ href: '/gestion/suggestions', label: 'Suggestions', icone: Lightbulb },
				{ href: '/gestion/publicites', label: 'Publicités', icone: Megaphone }
			]
		},
		{
			titre: 'Configuration',
			liens: [
				{ href: '/gestion/referentiels', label: 'Référentiels', icone: Database },
				{ href: '/gestion/parametres', label: 'Paramètres', icone: Settings },
				{ href: '/gestion/journaux', label: 'Journaux', icone: ScrollText }
			]
		}
	]);

	function actif(l: Lien): boolean {
		const p = page.url.pathname;
		return l.exact ? p === l.href : p === l.href || p.startsWith(l.href + '/');
	}
</script>

<div class="flex h-full flex-col bg-fleuve-900 text-fleuve-100">
	<div class="flex items-center gap-3 border-b border-white/10 px-4 py-4">
		<span class="grid size-10 shrink-0 place-items-center rounded-full bg-laterite-600 font-display text-lg font-bold text-white" aria-hidden="true">
			{nomSite.slice(0, 1)}
		</span>
		<div class="min-w-0">
			<p class="truncate font-display text-lg leading-tight font-bold text-white">{nomSite}</p>
			<p class="text-xs tracking-wide text-fleuve-200 uppercase">Gestion</p>
		</div>
	</div>

	<nav aria-label="Navigation de la gestion" class="flex-1 overflow-y-auto px-2 py-3">
		{#each groupes as g (g.titre)}
			<p class="px-3 pt-3 pb-1 text-[11px] font-bold tracking-wider text-fleuve-300 uppercase">{g.titre}</p>
			<ul>
				{#each g.liens as l (l.href)}
					{@const a = actif(l)}
					<li>
						<a
							href={l.href}
							aria-current={a ? 'page' : undefined}
							class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors {a
								? 'bg-white/10 text-white'
								: 'text-fleuve-100 hover:bg-white/5 hover:text-white'}"
						>
							<l.icone class="size-5 shrink-0 {a ? 'text-soleil-300' : 'text-fleuve-300'}" aria-hidden="true" />
							<span class="flex-1">{l.label}</span>
							{#if l.badge}
								<span class="rounded-full bg-laterite-600 px-2 py-0.5 text-xs font-bold text-white">
									{l.badge}<span class="sr-only"> en attente</span>
								</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/each}
	</nav>

	<div class="space-y-1 border-t border-white/10 px-2 py-3">
		<div class="flex items-center gap-3 px-3 py-2">
			<Avatar src={gestionnaire.photo_url} nom={gestionnaire.pseudonyme || gestionnaire.nom} taille="sm" />
			<div class="min-w-0 text-sm">
				<p class="truncate font-semibold text-white">{gestionnaire.pseudonyme || gestionnaire.nom}</p>
				<p class="truncate text-xs text-fleuve-300">
					{[gestionnaire.droit_attribution && 'Attribution', gestionnaire.droit_caisse && 'Caisse', gestionnaire.droit_activation && 'Activation']
						.filter(Boolean)
						.join(' · ') || 'Consultation'}
				</p>
			</div>
		</div>
		<a href="/" class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium hover:bg-white/5 hover:text-white">
			<ExternalLink class="size-5 text-fleuve-300" aria-hidden="true" />Voir le site
		</a>
		<form method="POST" action="/deconnexion">
			<button class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] font-medium text-laterite-100 hover:bg-white/5">
				<LogOut class="size-5" aria-hidden="true" />Se déconnecter
			</button>
		</form>
	</div>
</div>
