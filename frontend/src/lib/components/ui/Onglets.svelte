<script lang="ts">
	import { page } from '$app/state';

	type Onglet = { href: string; label: string; compteur?: number | null; actif?: boolean };
	let { onglets, label = 'Rubriques' }: { onglets: Onglet[]; label?: string } = $props();

	function estActif(o: Onglet): boolean {
		if (o.actif !== undefined) return o.actif;
		const cible = new URL(o.href, page.url);
		if (cible.pathname !== page.url.pathname) return page.url.pathname.startsWith(cible.pathname + '/');
		for (const [k, v] of cible.searchParams) if (page.url.searchParams.get(k) !== v) return false;
		return true;
	}
</script>

<nav aria-label={label} class="-mb-px overflow-x-auto">
	<ul class="flex min-w-max gap-1 border-b border-fleuve-100">
		{#each onglets as o (o.href)}
			{@const actif = estActif(o)}
			<li>
				<a
					href={o.href}
					aria-current={actif ? 'page' : undefined}
					class="inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-[15px] font-semibold transition-colors {actif
						? 'border-laterite-600 text-fleuve-800'
						: 'border-transparent text-ardoise hover:border-fleuve-200 hover:text-fleuve-700'}"
				>
					{o.label}
					{#if o.compteur !== undefined && o.compteur !== null}
						<span class="rounded-full px-2 py-0.5 text-xs {actif ? 'bg-fleuve-700 text-white' : 'bg-sable text-ardoise'}">{o.compteur}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</nav>
