<script lang="ts">
	/** Message d'état. Avec `champs`, affiche un récapitulatif cliquable des erreurs (style GOV.UK). */
	import type { Snippet } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let {
		type = 'info',
		titre,
		champs,
		children,
		class: classe = ''
	}: {
		type?: 'info' | 'succes' | 'erreur' | 'attention';
		titre?: string;
		champs?: Record<string, string>;
		children?: Snippet;
		class?: string;
	} = $props();

	const styles = {
		info: 'bg-fleuve-50 text-fleuve-800 ring-fleuve-100',
		succes: 'bg-foret-50 text-foret-700 ring-foret-100',
		erreur: 'bg-alerte-50 text-alerte ring-alerte/20',
		attention: 'bg-soleil-100 text-encre ring-soleil-300'
	};
	const icones = { info: Info, succes: CircleCheck, erreur: CircleAlert, attention: TriangleAlert };
	const Icone = $derived(icones[type]);
	const liste = $derived(Object.entries(champs ?? {}).filter(([k]) => k !== '_'));
	const general = $derived(champs?._);
</script>

<div
	class="flex gap-3 rounded-xl p-4 ring-1 {styles[type]} {classe}"
	role={type === 'erreur' ? 'alert' : 'status'}
	tabindex="-1"
>
	<Icone class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
	<div class="min-w-0 space-y-1 text-[15px]">
		{#if titre}<p class="font-semibold">{titre}</p>{/if}
		{#if general}<p>{general}</p>{/if}
		{#if liste.length}
			<ul class="list-disc space-y-0.5 pl-5">
				{#each liste as [cle, msg] (cle)}
					<li><a href="#champ-{cle.split('.')[0]}" class="underline underline-offset-2">{msg}</a></li>
				{/each}
			</ul>
		{/if}
		{@render children?.()}
	</div>
</div>
