<script lang="ts">
	/** Encart « Nouveautés » / « Les plus visités » (F-S3-06/07) : vignette + début de description. */
	import { tronquer } from '$lib/format';

	type Element = { href: string; titre: string; texte: string; photo_url: string | null; meta?: string };
	let { titre, elements, ton = 'foret' }: { titre: string; elements: Element[]; ton?: 'foret' | 'laterite' } = $props();
	const bandeau = $derived(ton === 'foret' ? 'bg-foret-600' : 'bg-laterite-600');
</script>

{#if elements.length}
	<section class="carte overflow-hidden" aria-label={titre}>
		<h2 class="{bandeau} px-4 py-2 font-display text-base font-bold text-white">{titre}</h2>
		<ul class="divide-y divide-fleuve-900/5">
			{#each elements as e (e.href)}
				<li>
					<a href={e.href} class="flex min-h-16 gap-3 p-3 hover:bg-fleuve-50">
						{#if e.photo_url}
							<img src={e.photo_url} alt="" loading="lazy" class="size-14 shrink-0 rounded-lg object-cover" />
						{:else}
							<span class="pagne size-14 shrink-0 rounded-lg bg-sable" aria-hidden="true"></span>
						{/if}
						<span class="min-w-0 text-sm">
							<span class="block font-semibold text-fleuve-800">{tronquer(e.titre, 48)}</span>
							<span class="block text-ardoise">{tronquer(e.texte, 50)}</span>
							{#if e.meta}<span class="montant block font-semibold text-laterite-700">{e.meta}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
