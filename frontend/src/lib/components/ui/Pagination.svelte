<script lang="ts">
	/** Pagination par liens (fonctionne sans JavaScript) ; conserve les filtres de l'URL. */
	import { page as p } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { total, page, taille }: { total: number; page: number; taille: number } = $props();

	const pages = $derived(Math.max(1, Math.ceil(total / taille)));
	function lien(n: number) {
		const u = new URL(p.url);
		if (n <= 1) u.searchParams.delete('page');
		else u.searchParams.set('page', String(n));
		return u.pathname + u.search;
	}
	const numeros = $derived.by(() => {
		const s = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
		return [...s].sort((a, b) => a - b);
	});
</script>

{#if pages > 1}
	<nav aria-label="Pagination" class="mt-8 flex items-center justify-between gap-2">
		<a
			href={lien(page - 1)}
			class="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-semibold text-fleuve-700 hover:bg-fleuve-50 {page <= 1
				? 'pointer-events-none opacity-40'
				: ''}"
			aria-disabled={page <= 1}
		>
			<ChevronLeft class="size-5" aria-hidden="true" /> Précédent
		</a>
		<ul class="hidden items-center gap-1 sm:flex">
			{#each numeros as n, i (n)}
				{#if i > 0 && n - numeros[i - 1] > 1}<li class="px-1 text-ardoise">…</li>{/if}
				<li>
					<a
						href={lien(n)}
						aria-current={n === page ? 'page' : undefined}
						class="grid size-11 place-items-center rounded-xl font-semibold {n === page
							? 'bg-fleuve-700 text-white'
							: 'text-fleuve-700 hover:bg-fleuve-50'}">{n}</a
					>
				</li>
			{/each}
		</ul>
		<span class="text-sm text-ardoise sm:hidden">Page {page} / {pages}</span>
		<a
			href={lien(page + 1)}
			class="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-semibold text-fleuve-700 hover:bg-fleuve-50 {page >= pages
				? 'pointer-events-none opacity-40'
				: ''}"
			aria-disabled={page >= pages}
		>
			Suivant <ChevronRight class="size-5" aria-hidden="true" />
		</a>
	</nav>
{/if}
