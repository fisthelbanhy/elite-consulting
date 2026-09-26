<script lang="ts">
	/** Texte d'introduction repris du legacy : paragraphes, liste à puces, paragraphes de fin. */
	import type { Bloc } from './contenus';

	let { bloc }: { bloc: Bloc | undefined } = $props();
</script>

{#if bloc}
	<div class="space-y-3 text-[17px] leading-relaxed">
		{#each bloc.paragraphes ?? [] as p (p)}<p>{p}</p>{/each}
		{#if bloc.puces?.length}
			<ul class="list-disc space-y-1.5 pl-6 marker:text-laterite-600">
				{#each bloc.puces as p (p)}<li>{p}</li>{/each}
			</ul>
		{/if}
		{#each bloc.apres ?? [] as p (p)}<p class="font-semibold">{p}</p>{/each}
	</div>
{/if}
