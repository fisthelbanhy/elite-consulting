<script lang="ts">
	/** Les 20 groupes FLP (F-S5-10) : grille à l'accueil de la boutique, puces une fois filtré. */
	import type { Groupe } from '$lib/types/boutique';

	let { groupes, actif = '', compact = false }: { groupes: Groupe[]; actif?: string; compact?: boolean } = $props();
	const avecProduits = $derived(groupes.filter((g) => g.nombre > 0));
</script>

{#if compact}
	<nav aria-label="Rayons" class="-mx-4 overflow-x-auto px-4 pb-1">
		<ul class="flex gap-2 whitespace-nowrap">
			<li>
				<a href="/boutique" class="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold ring-1 ring-fleuve-100 hover:bg-fleuve-50 {actif === '' ? 'bg-fleuve-700 text-white ring-fleuve-700 hover:bg-fleuve-700' : 'bg-white text-fleuve-700'}">Tout</a>
			</li>
			{#each avecProduits as g (g.groupe)}
				<li>
					<a
						href="/boutique?groupe={g.groupe}"
						aria-current={actif === String(g.groupe) ? 'page' : undefined}
						class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold ring-1 ring-fleuve-100 {actif === String(g.groupe) ? 'bg-fleuve-700 text-white ring-fleuve-700' : 'bg-white text-fleuve-700 hover:bg-fleuve-50'}"
					>
						{g.libelle}<span class="text-sm opacity-75">{g.nombre}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{:else}
	<section aria-labelledby="titre-rayons">
		<h2 id="titre-rayons" class="text-xl font-bold">Nos rayons</h2>
		<ul class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
			{#each groupes as g (g.groupe)}
				<li>
					{#if g.nombre > 0}
						<a href="/boutique?groupe={g.groupe}" class="carte flex min-h-16 items-center justify-between gap-2 px-4 py-3 hover:shadow-levee">
							<span class="font-semibold text-fleuve-800">{g.libelle}</span>
							<span class="rounded-full bg-fleuve-50 px-2 text-sm font-semibold text-fleuve-700">{g.nombre}</span>
						</a>
					{:else}
						<div class="flex min-h-16 items-center justify-between gap-2 rounded-carte bg-sable/60 px-4 py-3 text-ardoise">
							<span>{g.libelle}</span><span class="text-xs">bientôt</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
