<script lang="ts">
	/** Barre de navigation inférieure mobile (ADR-0008) : Accueil · Se lancer · Financer · Opportunités · Moi. */
	import { page } from '$app/state';
	import House from '@lucide/svelte/icons/house';
	import Rocket from '@lucide/svelte/icons/rocket';
	import CircleDollarSign from '@lucide/svelte/icons/circle-dollar-sign';
	import Compass from '@lucide/svelte/icons/compass';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import { PILIERS } from '$lib/navigation';

	let { connecte }: { connecte: boolean } = $props();

	const items = $derived([
		{ href: '/', label: 'Accueil', icone: House, pilier: null },
		{ href: '/se-lancer', label: 'Se lancer', icone: Rocket, pilier: 'se-lancer' },
		{ href: '/financer', label: 'Financer', icone: CircleDollarSign, pilier: 'financer' },
		{ href: '/opportunites', label: 'Opportunités', icone: Compass, pilier: 'opportunites' },
		{ href: connecte ? '/espace' : '/connexion', label: 'Moi', icone: CircleUser, pilier: 'moi' }
	]);

	function actif(it: (typeof items)[number]) {
		const p = page.url.pathname;
		if (it.href === '/') return p === '/';
		if (it.pilier === 'moi') return p.startsWith('/espace') || p.startsWith('/connexion') || p.startsWith('/inscription');
		const pilier = PILIERS.find((x) => x.id === it.pilier);
		return p.startsWith(it.href) || !!pilier?.liens.some((l) => p === l.href || p.startsWith(l.href + '/'));
	}
</script>

<nav
	aria-label="Navigation rapide"
	class="fixed inset-x-0 bottom-0 z-40 border-t border-fleuve-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
>
	<ul class="grid grid-cols-5">
		{#each items as it (it.href)}
			{@const a = actif(it)}
			<li>
				<a
					href={it.href}
					aria-current={a ? 'page' : undefined}
					class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold {a ? 'text-laterite-700' : 'text-ardoise'}"
				>
					<it.icone class="size-6" aria-hidden="true" strokeWidth={a ? 2.25 : 1.75} />
					{it.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
