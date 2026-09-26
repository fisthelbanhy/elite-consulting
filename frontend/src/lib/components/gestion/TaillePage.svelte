<script lang="ts">
	/** « Lignes par page » (F-TRV-66 : 50 à 500) ; conserve les autres filtres de l'URL. */
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { taille }: { taille: number } = $props();

	function changer(e: Event) {
		const u = new URL(page.url);
		u.searchParams.set('taille', (e.currentTarget as HTMLSelectElement).value);
		u.searchParams.delete('page');
		goto(u.pathname + u.search, { keepFocus: true });
	}
</script>

<label class="flex items-center gap-2 text-sm text-ardoise">
	Lignes par page
	<select class="w-auto py-1.5 text-sm" value={String(taille)} onchange={changer}>
		{#each [50, 100, 200, 500] as t (t)}<option value={String(t)}>{t}</option>{/each}
	</select>
</label>
